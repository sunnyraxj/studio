
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTablePagination } from '@/components/data-table-pagination';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Search, PlusCircle, Pencil, Trash2, X, IndianRupee } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, writeBatch, getDocs, where, runTransaction } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast.tsx';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Supplier = {
  id: string;
  name: string;
  category: string;
  phone?: string;
  email?: string;
  address?: string;
};

type Purchase = {
  id: string;
  billNumber?: string;
  billDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'Paid' | 'Unpaid' | 'Partially Paid';
  items: { itemName: string; quantity: number; rate: number }[];
  payments?: PurchasePayment[];
};

type PurchasePayment = {
  id: string;
  paymentDate: string;
  amount: number;
  mode: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
  notes?: string;
};

type AggregatedSupplier = Supplier & {
  totalPurchase: number;
  totalPaid: number;
  totalDue: number;
};

const demoSuppliers: Supplier[] = [
    { id: 'sup1', name: 'Global Textiles', category: 'Fabric', phone: '9876543210', email: 'contact@globaltextiles.com', address: '123 Textile Market, Mumbai' },
    { id: 'sup2', name: 'Premium Leathers', category: 'Raw Material', phone: '9876543211', email: 'sales@premiumleathers.in', address: '456 Tannery Road, Kanpur' },
];

const SupplierDetails: React.FC<{ supplier: AggregatedSupplier, shopId: string | null, isDemoMode: boolean, onClose: () => void }> = ({ supplier, shopId, isDemoMode, onClose }) => {
    const firestore = useFirestore();
    const purchasesQuery = useMemoFirebase(() => (shopId && firestore ? query(collection(firestore, `shops/${shopId}/suppliers/${supplier.id}/purchases`), orderBy('billDate', 'desc')) : null), [shopId, firestore, supplier.id]);
    const { data: purchasesData, isLoading: isPurchasesLoading } = useCollection<Purchase>(purchasesQuery);

    const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
    const [purchaseForm, setPurchaseForm] = useState<Partial<Purchase & { paymentMode: PurchasePayment['mode']}>>({ 
      items: [{ itemName: '', quantity: 1, rate: 0 }], 
      billDate: format(new Date(), 'yyyy-MM-dd'),
      paidAmount: 0,
      paymentMode: 'Bank Transfer'
    });

    const handlePurchaseItemChange = (index: number, field: 'itemName' | 'quantity' | 'rate', value: string | number) => {
        const newItems = [...(purchaseForm.items || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        setPurchaseForm(prev => ({ ...prev, items: newItems }));
    };

    const addPurchaseItem = () => {
        setPurchaseForm(prev => ({ ...prev, items: [...(prev.items || []), { itemName: '', quantity: 1, rate: 0 }] }));
    };

    const removePurchaseItem = (index: number) => {
        setPurchaseForm(prev => ({ ...prev, items: prev.items?.filter((_, i) => i !== index) }));
    };
    
    const purchaseFormTotal = useMemo(() => {
        return purchaseForm.items?.reduce((total, item) => total + (Number(item.quantity) * Number(item.rate)), 0) || 0;
    }, [purchaseForm.items]);

    const handleSavePurchase = async () => {
        if (isDemoMode || !shopId || !firestore) {
            toast({ title: "Demo Mode", description: "Cannot save purchase in demo." });
            return;
        }

        if (!purchaseForm.billDate) {
            toast({ variant: 'destructive', title: 'Error', description: 'Bill date is required.'});
            return;
        }

        const totalAmount = purchaseFormTotal;
        const paidAmount = Number(purchaseForm.paidAmount) || 0;

        if (paidAmount > totalAmount) {
            toast({ variant: 'destructive', title: 'Invalid Payment', description: 'Paid amount cannot be greater than the total bill amount.'});
            return;
        }

        const status = paidAmount === 0 ? 'Unpaid' : paidAmount < totalAmount ? 'Partially Paid' : 'Paid';

        // Destructure to separate paymentMode from the purchase data
        const { paymentMode, ...purchaseCoreData } = purchaseForm;
        
        const finalPurchaseData = {
            ...purchaseCoreData,
            billDate: new Date(purchaseForm.billDate).toISOString(),
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            status: status,
        };
        
        try {
            const purchaseRef = doc(collection(firestore, `shops/${shopId}/suppliers/${supplier.id}/purchases`));
            
            await runTransaction(firestore, async (transaction) => {
                transaction.set(purchaseRef, finalPurchaseData);
                
                // If an initial payment is made, create a payment subdocument
                if (paidAmount > 0) {
                    const paymentRef = doc(collection(purchaseRef, 'payments'));
                    transaction.set(paymentRef, {
                        paymentDate: new Date().toISOString(),
                        amount: paidAmount,
                        mode: paymentMode,
                        notes: 'Initial payment with bill',
                    });
                }
            });
            
            toast({ title: 'Success', description: 'Purchase bill added.' });
            setIsAddPurchaseOpen(false);
            setPurchaseForm({ items: [{ itemName: '', quantity: 1, rate: 0 }], billDate: format(new Date(), 'yyyy-MM-dd') });
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };
    
    return (
        <DialogContent className="max-w-6xl">
            <DialogHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <DialogTitle className="text-2xl">{supplier.name}</DialogTitle>
                        <DialogDescription>{supplier.category} | {supplier.phone} | {supplier.email}</DialogDescription>
                    </div>
                    <Button onClick={() => setIsAddPurchaseOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Purchase Bill</Button>
                </div>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-4 text-center p-4 border rounded-lg bg-muted/50 my-4">
                <div>
                    <p className="text-sm text-muted-foreground">Total Purchase</p>
                    <p className="text-xl font-bold flex items-center justify-center gap-1"><IndianRupee className="h-5 w-5"/>{supplier.totalPurchase.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-xl font-bold text-green-600 flex items-center justify-center gap-1"><IndianRupee className="h-5 w-5"/>{supplier.totalPaid.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Total Due</p>
                    <p className="text-xl font-bold text-destructive flex items-center justify-center gap-1"><IndianRupee className="h-5 w-5"/>{supplier.totalDue.toLocaleString()}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Purchase History</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="max-h-[40vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bill Date</TableHead>
                                    <TableHead>Bill #</TableHead>
                                    <TableHead className="text-right">Total Amount</TableHead>
                                    <TableHead className="text-right">Amount Paid</TableHead>
                                    <TableHead className="text-right">Due</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isPurchasesLoading ? <TableRow><TableCell colSpan={6} className="text-center">Loading purchases...</TableCell></TableRow>
                                : purchasesData && purchasesData.length > 0 ? purchasesData.map(p => {
                                    const due = p.totalAmount - p.paidAmount;
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell>{format(new Date(p.billDate), 'dd MMM, yyyy')}</TableCell>
                                            <TableCell>{p.billNumber || 'N/A'}</TableCell>
                                            <TableCell className="text-right font-medium flex items-center justify-end gap-1"><IndianRupee className="h-4 w-4"/>{p.totalAmount.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-green-600 flex items-center justify-end gap-1"><IndianRupee className="h-4 w-4"/>{p.paidAmount.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-destructive flex items-center justify-end gap-1"><IndianRupee className="h-4 w-4"/>{due.toLocaleString()}</TableCell>
                                            <TableCell><Badge variant={p.status === 'Paid' ? 'default' : p.status === 'Unpaid' ? 'destructive' : 'secondary'}>{p.status}</Badge></TableCell>
                                        </TableRow>
                                    )
                                })
                                : <TableRow><TableCell colSpan={6} className="text-center">No purchase bills found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isAddPurchaseOpen} onOpenChange={setIsAddPurchaseOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader><DialogTitle>Add New Purchase Bill for {supplier.name}</DialogTitle></DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1">
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2"><Label>Bill Number (Optional)</Label><Input value={purchaseForm.billNumber || ''} onChange={e => setPurchaseForm(p => ({...p, billNumber: e.target.value}))}/></div>
                            <div className="space-y-2"><Label>Bill Date*</Label><Input type="date" value={purchaseForm.billDate} onChange={e => setPurchaseForm(p => ({...p, billDate: e.target.value}))}/></div>
                        </div>
                        <Separator className="my-4" />
                        <h4 className="font-semibold mb-2">Items</h4>
                        <div className="space-y-2">
                           {purchaseForm.items?.map((item, index) => (
                                <div key={index} className="flex gap-2 items-end">
                                    <div className="flex-grow space-y-1"><Label>Item Name</Label><Input value={item.itemName} onChange={e => handlePurchaseItemChange(index, 'itemName', e.target.value)} /></div>
                                    <div className="w-24 space-y-1"><Label>Quantity</Label><Input type="number" value={item.quantity} onChange={e => handlePurchaseItemChange(index, 'quantity', Number(e.target.value))} /></div>
                                    <div className="w-32 space-y-1"><Label>Rate</Label><Input type="number" value={item.rate} onChange={e => handlePurchaseItemChange(index, 'rate', Number(e.target.value))} /></div>
                                    <div className="w-32 space-y-1 text-right">
                                        <Label>Item Total</Label>
                                        <p className="font-semibold h-10 flex items-center justify-end pr-2"><span className="flex items-center gap-1"><IndianRupee className="h-4 w-4"/>{(Number(item.quantity) * Number(item.rate)).toLocaleString()}</span></p>
                                    </div>
                                    <Button variant="destructive" size="icon" onClick={() => removePurchaseItem(index)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={addPurchaseItem} className="mt-2"><PlusCircle className="mr-2 h-4 w-4"/>Add Row</Button>
                         <Separator className="my-4" />
                         <div className="flex justify-between items-end">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Payment Mode</Label>
                                    <RadioGroup value={purchaseForm.paymentMode} onValueChange={(v) => setPurchaseForm(p => ({ ...p, paymentMode: v as any }))} className="flex gap-4">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Bank Transfer" id="bank" /><Label htmlFor="bank">Bank Transfer</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Cash" id="cash" /><Label htmlFor="cash">Cash</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="UPI" id="upi" /><Label htmlFor="upi">UPI</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Cheque" id="cheque" /><Label htmlFor="cheque">Cheque</Label></div>
                                    </RadioGroup>
                                </div>
                                 <div className="space-y-2">
                                    <Label>Amount Paid Now (Optional)</Label>
                                    <div className="relative w-48">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input type="number" value={purchaseForm.paidAmount || ''} onChange={e => setPurchaseForm(p => ({...p, paidAmount: Number(e.target.value)}))} className="pl-8" />
                                    </div>
                                </div>
                            </div>
                            <div className="text-right space-y-2">
                                <p className="text-2xl font-bold">Total Bill Amount: <span className="flex items-center justify-end gap-1"><IndianRupee className="h-6 w-6" />{purchaseFormTotal.toLocaleString()}</span></p>
                                {Number(purchaseForm.paidAmount) > 0 && <p className="text-lg font-semibold text-destructive">Balance Due: <span className="flex items-center justify-end gap-1"><IndianRupee className="h-5 w-5" />{(purchaseFormTotal - (Number(purchaseForm.paidAmount) || 0)).toLocaleString()}</span></p>}
                            </div>
                         </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSavePurchase}>Save Bill</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DialogContent>
    );
}

export default function SuppliersPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  
  const [selectedSupplier, setSelectedSupplier] = useState<AggregatedSupplier | null>(null);
  
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({});

  const userDocRef = useMemoFirebase(() => (user && firestore ? doc(firestore, `users/${user.uid}`) : null), [user, firestore]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  const suppliersQuery = useMemoFirebase(() => (shopId && firestore ? query(collection(firestore, `shops/${shopId}/suppliers`), orderBy('name')) : null), [shopId, firestore]);
  const { data: suppliersData, isLoading: isSuppliersLoading } = useCollection<Supplier>(suppliersQuery);

  const [aggregatedData, setAggregatedData] = useState<AggregatedSupplier[]>([]);
  const [isAggregating, setIsAggregating] = useState(true);

  useEffect(() => {
    const aggregateData = async () => {
        if (isDemoMode) {
            setAggregatedData(demoSuppliers.map(s => ({ ...s, totalPurchase: 50000, totalPaid: 35000, totalDue: 15000 })));
            setIsAggregating(false);
            return;
        }

        if (!suppliersData || !shopId || !firestore) {
            if (!isSuppliersLoading) {
              setAggregatedData([]);
              setIsAggregating(false);
            }
            return;
        }
        
        setIsAggregating(true);
        const aggregated: AggregatedSupplier[] = await Promise.all(suppliersData.map(async (s) => {
            const purchasesRef = collection(firestore, `shops/${shopId}/suppliers/${s.id}/purchases`);
            const purchasesSnapshot = await getDocs(purchasesRef);
            const purchases = purchasesSnapshot.docs.map(d => d.data() as Purchase);

            const totalPurchase = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
            const totalPaid = purchases.reduce((sum, p) => sum + p.paidAmount, 0);
            
            return {
                ...s,
                totalPurchase,
                totalPaid,
                totalDue: totalPurchase - totalPaid,
            };
        }));
        
        setAggregatedData(aggregated);
        setIsAggregating(false);
    };

    aggregateData();
  }, [suppliersData, isDemoMode, shopId, firestore, isSuppliersLoading]);


  const filteredData = useMemo(() => aggregatedData.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())), [aggregatedData, searchTerm]);

  const handleSaveSupplier = async () => {
    if (isDemoMode || !shopId || !firestore) return;
    const ref = collection(firestore, `shops/${shopId}/suppliers`);
    try {
        if(supplierForm.id) { // Editing
            await updateDoc(doc(ref, supplierForm.id), supplierForm);
            toast({ title: 'Success', description: 'Supplier updated.'});
        } else { // Adding
            await addDoc(ref, { ...supplierForm, dateAdded: serverTimestamp() });
            toast({ title: 'Success', description: 'New supplier added.'});
        }
        setIsAddSupplierOpen(false);
        setSupplierForm({});
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  }
  
  const handleDeleteSupplier = async (supplierId: string) => {
      if (isDemoMode || !shopId || !firestore) return;
      try {
          await deleteDoc(doc(firestore, `shops/${shopId}/suppliers`, supplierId));
          toast({ title: 'Success', description: 'Supplier deleted.' });
      } catch (e: any) {
           toast({ variant: 'destructive', title: 'Error', description: e.message });
      }
  }

  const columns: ColumnDef<AggregatedSupplier>[] = [
    { accessorKey: 'name', header: 'Supplier Name', cell: ({row}) => <div className="font-medium">{row.original.name}</div> },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'email', header: 'Email' },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right space-x-2">
          <Button variant="outline" size="sm" onClick={() => { setSelectedSupplier(row.original); setIsViewDetailsOpen(true) }}>View Details</Button>
           <Button size="sm" onClick={() => { setSupplierForm(row.original); setIsAddSupplierOpen(true); }}><Pencil className="mr-2 h-4 w-4"/>Edit</Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Suppliers</CardTitle>
            <CardDescription>Manage your suppliers and track purchases & payments.</CardDescription>
          </div>
          <Button onClick={() => { setSupplierForm({}); setIsAddSupplierOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Add Supplier</Button>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center py-4 px-2 border-y">
              <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by supplier name..." className="pl-8 w-80" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>{headerGroup.headers.map((header) => <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isSuppliersLoading || isAggregating ? (
                  <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading suppliers...</TableCell></TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No suppliers found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="py-4"><DataTablePagination table={table} /></div>
        </CardContent>
      </Card>

      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{supplierForm.id ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name*</Label><Input value={supplierForm.name || ''} onChange={e => setSupplierForm(p => ({...p, name: e.target.value}))} /></div>
                <div className="space-y-2"><Label>Category</Label><Input value={supplierForm.category || ''} onChange={e => setSupplierForm(p => ({...p, category: e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Phone</Label><Input value={supplierForm.phone || ''} onChange={e => setSupplierForm(p => ({...p, phone: e.target.value}))} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={supplierForm.email || ''} onChange={e => setSupplierForm(p => ({...p, email: e.target.value}))} /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Textarea value={supplierForm.address || ''} onChange={e => setSupplierForm(p => ({...p, address: e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveSupplier}>Save Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
          {selectedSupplier && <SupplierDetails supplier={selectedSupplier} shopId={shopId} isDemoMode={isDemoMode} onClose={() => setIsViewDetailsOpen(false)} />}
      </Dialog>
    </>
  );
}
