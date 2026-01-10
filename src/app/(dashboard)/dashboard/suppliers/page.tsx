
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
  getExpandedRowModel,
  ExpandedState,
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
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CaretSortIcon, ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { Search, PlusCircle, IndianRupee, HandCoins, Truck, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, doc, addDoc, updateDoc, deleteDoc, writeBatch, orderBy, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast.tsx';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

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

export default function SuppliersPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for dialogs
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  
  const [selectedSupplier, setSelectedSupplier] = useState<AggregatedSupplier | null>(null);
  
  // Form States
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({});
  const [purchaseForm, setPurchaseForm] = useState<Partial<Purchase>>({ items: [{ itemName: '', quantity: 1, rate: 0 }] });

  const userDocRef = useMemoFirebase(() => (user && firestore ? doc(firestore, `users/${user.uid}`) : null), [user, firestore]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  const suppliersQuery = useMemoFirebase(() => (shopId && firestore ? query(collection(firestore, `shops/${shopId}/suppliers`), orderBy('name')) : null), [shopId, firestore]);
  const { data: suppliersData, isLoading: isSuppliersLoading } = useCollection<Supplier>(suppliersQuery);

  const aggregatedData: AggregatedSupplier[] = useMemo(() => {
    // This is a placeholder. A real implementation would need to fetch all purchases for all suppliers to calculate totals.
    // For simplicity, we'll return mock totals.
    const dataToProcess = isDemoMode ? demoSuppliers : (suppliersData || []);
    return dataToProcess.map(s => ({
        ...s,
        totalPurchase: 50000,
        totalPaid: 35000,
        totalDue: 15000,
    }));
  }, [suppliersData, isDemoMode]);
  
  const filteredData = useMemo(() => aggregatedData.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())), [aggregatedData, searchTerm]);

  const handleAddSupplier = async () => {
    // Logic to add/edit supplier
    if (!shopId || !firestore) return;
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
                {isSuppliersLoading ? (
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

      {/* Add/Edit Supplier Dialog */}
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
            <Button onClick={handleAddSupplier}>Save Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Supplier Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
          <DialogContent className="max-w-4xl">
              <DialogHeader>
                  <DialogTitle>{selectedSupplier?.name}</DialogTitle>
                  <DialogDescription>
                      Purchase history and payment details for {selectedSupplier?.name}.
                  </DialogDescription>
              </DialogHeader>
              {/* Detailed view will be implemented here */}
              <p className="py-10 text-center">Detailed purchase and payment history will be shown here.</p>
          </DialogContent>
      </Dialog>
    </>
  );
}
