
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, IndianRupee, RotateCcw } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, getDocs, limit, doc, addDoc, orderBy, runTransaction } from 'firebase/firestore';
import type { Sale, SaleItem, CreditNote } from '../../page';
import { toast } from '@/hooks/use-toast.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DataTablePagination } from '@/components/data-table-pagination';
import type { ColumnDef } from '@tanstack/react-table';
import { useReactTable, getCoreRowModel, flexRender, getPaginationRowModel } from '@tanstack/react-table';

type ReturnItem = SaleItem & {
    returnQuantity: number;
};

const returnHistoryColumns: ColumnDef<CreditNote>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => format(new Date(row.getValue('date')), 'dd MMM, yyyy'),
  },
  {
    accessorKey: 'creditNoteNumber',
    header: 'Credit Note #',
    cell: ({ row }) => <Badge variant="secondary">{row.getValue('creditNoteNumber')}</Badge>,
  },
  {
    accessorKey: 'originalInvoiceNumber',
    header: 'Original Invoice #',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('originalInvoiceNumber')}</Badge>,
  },
  {
    accessorKey: 'customer.name',
    header: 'Customer Name',
  },
  {
    accessorKey: 'totalAmount',
    header: () => <div className="text-right">Return Value</div>,
    cell: ({ row }) => <div className="text-right font-semibold flex items-center justify-end gap-1"><IndianRupee className="h-4 w-4" />{Math.abs(row.original.totalAmount).toLocaleString('en-IN')}</div>
  }
];


export function SalesReturnTab() {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [foundSale, setFoundSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !firestore || !user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  const settingsDocRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return doc(firestore, `shops/${shopId}/settings`, 'details');
  }, [firestore, shopId, isDemoMode]);
  const { data: shopSettings } = useDoc(settingsDocRef);

  const creditNotesQuery = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return query(collection(firestore, `shops/${shopId}/creditNotes`), orderBy('date', 'desc'));
  }, [shopId, firestore, isDemoMode]);

  const { data: creditNotesData, isLoading: isHistoryLoading } = useCollection<CreditNote>(creditNotesQuery);
  const [demoCreditNotes, setDemoCreditNotes] = useState<CreditNote[]>([]);

  const returnsHistory = isDemoMode ? demoCreditNotes : (creditNotesData || []);

  const historyTable = useReactTable({
      data: returnsHistory,
      columns: returnHistoryColumns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
  });

  const handleSearch = async () => {
    if (!invoiceNumber.trim()) {
      setError('Please enter an invoice number.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFoundSale(null);
    setReturnItems([]);
    
    if (isDemoMode) {
      toast({ title: 'Search functionality is disabled in demo mode.' });
      setIsLoading(false);
      return;
    }

    if (!shopId || !firestore) {
      setError('Shop information not found.');
      setIsLoading(false);
      return;
    }
    
    try {
      const salesRef = collection(firestore, `shops/${shopId}/sales`);
      const q = query(salesRef, where('invoiceNumber', '==', invoiceNumber.trim()), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError(`Invoice "${invoiceNumber.trim()}" not found.`);
      } else {
        const saleData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Sale;
        if(saleData.status === "Fully Returned" || saleData.status === "Cancelled") {
            setError(`Invoice "${invoiceNumber.trim()}" has already been fully returned or cancelled.`);
            return;
        }
        setFoundSale(saleData);
        setReturnItems(saleData.items.map(item => ({ ...item, returnQuantity: 0 })));
      }
    } catch (e: any) {
      setError(`An error occurred: ${e.message}`);
      toast({ variant: 'destructive', title: 'Search Failed', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setReturnItems(prevItems =>
      prevItems.map(item => {
        if (item.productId === productId) {
          const originalItem = foundSale?.items.find(i => i.productId === productId);
          const maxQuantity = originalItem?.quantity || 0;
          const newQuantity = Math.max(0, Math.min(isNaN(quantity) ? 0 : quantity, maxQuantity));
          return { ...item, returnQuantity: newQuantity };
        }
        return item;
      })
    );
  };
  
  const { totalReturnValue, totalTaxableValue, totalCgst, totalSgst, totalIgst } = useMemo(() => {
    const shopState = shopSettings?.companyState || '';
    const customerState = foundSale?.customer.state || '';
    const isIntraState = !customerState || customerState.trim().toLowerCase() === shopState.trim().toLowerCase();

    return returnItems.reduce((acc, item) => {
        if (item.returnQuantity > 0) {
            const itemMrp = item.price;
            const discountAmount = itemMrp * (item.discount / 100);
            const priceAfterDiscount = itemMrp - discountAmount;
            const totalItemPrice = priceAfterDiscount * item.returnQuantity;
            
            const gstRate = (item.gst || 0) / 100;
            const taxableValue = totalItemPrice / (1 + gstRate);
            const gstAmount = totalItemPrice - taxableValue;

            acc.totalTaxableValue += taxableValue;
            if (isIntraState) {
                acc.totalCgst += gstAmount / 2;
                acc.totalSgst += gstAmount / 2;
            } else {
                acc.totalIgst += gstAmount;
            }
            acc.totalReturnValue += totalItemPrice;
        }
        return acc;
    }, { totalReturnValue: 0, totalTaxableValue: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0 });

  }, [returnItems, shopSettings, foundSale]);


  const handleProcessReturn = async () => {
    if (!foundSale || returnItems.length === 0 || totalReturnValue === 0) {
      toast({ variant: 'destructive', title: 'Nothing to return' });
      return;
    }

    if (isDemoMode) {
      toast({ title: 'Demo mode', description: 'Cannot process returns in demo.' });
      return;
    }

    if (!shopId || !firestore) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const saleDocRef = doc(firestore, `shops/${shopId}/sales`, foundSale.id);
            const creditNoteRef = doc(collection(firestore, `shops/${shopId}/creditNotes`));

            // Generate Credit Note Number
            const cnQuery = query(collection(firestore, `shops/${shopId}/creditNotes`), orderBy('date', 'desc'), limit(1));
            const cnSnapshot = await getDocs(cnQuery);
            let lastCNNumber = 0;
            if (!cnSnapshot.empty) {
                const lastCN = cnSnapshot.docs[0].data() as CreditNote;
                const match = lastCN.creditNoteNumber.match(/CN-(\d+)$/);
                if (match) lastCNNumber = parseInt(match[1], 10);
            }
            const creditNoteNumber = `CN-${(lastCNNumber + 1).toString().padStart(4, '0')}`;

            // Create Credit Note
            const newCreditNoteData: Omit<CreditNote, 'id'> = {
              creditNoteNumber,
              originalInvoiceId: foundSale.id,
              originalInvoiceNumber: foundSale.invoiceNumber,
              date: new Date().toISOString(),
              customer: { name: foundSale.customer.name, phone: foundSale.customer.phone, gstin: foundSale.customer.gstin },
              items: returnItems.filter(i => i.returnQuantity > 0).map(i => ({...i, quantity: i.returnQuantity})),
              taxableValue: -totalTaxableValue,
              cgst: -totalCgst,
              sgst: -totalSgst,
              igst: -totalIgst,
              totalAmount: -totalReturnValue,
            };
            transaction.set(creditNoteRef, newCreditNoteData);

            // Update original sale status
            const originalQuantities: Record<string, number> = foundSale.items.reduce((acc, item) => ({...acc, [item.productId]: item.quantity}), {});
            
            const creditNotesForThisSale = await getDocs(query(collection(firestore, `shops/${shopId}/creditNotes`), where('originalInvoiceId', '==', foundSale.id)));
            const allReturnedItems: SaleItem[] = creditNotesForThisSale.docs.flatMap(doc => (doc.data() as CreditNote).items);
            allReturnedItems.push(...newCreditNoteData.items);
            
            const returnedQuantities: Record<string, number> = allReturnedItems.reduce((acc, item) => ({...acc, [item.productId]: (acc[item.productId] || 0) + item.quantity}), {});
            
            const isFullyReturned = Object.keys(originalQuantities).every(
                productId => (returnedQuantities[productId] || 0) >= originalQuantities[productId]
            );
            const newStatus = isFullyReturned ? 'Fully Returned' : 'Partially Returned';
            
            transaction.update(saleDocRef, { status: newStatus });
        });

        toast({
            title: 'Credit Note Generated',
            description: `Return for invoice ${foundSale.invoiceNumber} has been recorded.`
        });

        setInvoiceNumber('');
        setFoundSale(null);
        setReturnItems([]);
        setError(null);

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error processing return', description: e.message });
    }
  }


  return (
    <div className="h-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Credit Note</CardTitle>
          <CardDescription>
            Enter an invoice number to find the sale and process a return.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full max-w-sm items-center space-x-2 mx-auto mt-8">
            <Input
              type="text"
              placeholder="Enter Invoice #"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button type="submit" onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />} Search
            </Button>
          </div>

          {error && <p className="text-destructive text-center mt-4 text-sm">{error}</p>}

          {foundSale && (
            <Card className="mt-8">
              <CardHeader>
                <div className="flex justify-between items-start">
                   <div>
                      <CardTitle>Invoice Found: {foundSale.invoiceNumber}</CardTitle>
                      <CardDescription>
                        Customer: {foundSale.customer.name} | Date: {format(new Date(foundSale.date), 'dd MMM, yyyy')}
                      </CardDescription>
                   </div>
                   <Badge>Total: <IndianRupee className="h-3 w-3 mx-1" />{foundSale.total.toLocaleString()}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium mb-2">Select items and quantities to return:</p>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Original Qty</TableHead>
                        <TableHead className="text-center">Price</TableHead>
                        <TableHead className="w-[150px] text-center">Return Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnItems.map(item => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-center flex items-center justify-center gap-1"><IndianRupee className="h-3 w-3" />{item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                             <Input 
                                  type="number" 
                                  value={item.returnQuantity === 0 ? '' : item.returnQuantity}
                                  onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 0)}
                                  max={item.quantity}
                                  min={0}
                                  className="h-8 text-center"
                              />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-right">
                    <p className="text-lg font-bold flex items-center justify-end gap-1">Total Return Value: <IndianRupee className="h-5 w-5" />{totalReturnValue.toFixed(2)}</p>
                    <Button onClick={handleProcessReturn} disabled={totalReturnValue === 0} className="mt-2">
                      <RotateCcw className="mr-2 h-4 w-4" /> Process Return
                    </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Credit Note History</CardTitle>
            <CardDescription>A log of all processed sales returns.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {historyTable.getHeaderGroups().map(hg => (
                            <TableRow key={hg.id}>
                                {hg.headers.map(h => <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isHistoryLoading ? <TableRow><TableCell colSpan={returnHistoryColumns.length} className="h-24 text-center">Loading history...</TableCell></TableRow>
                        : historyTable.getRowModel().rows?.length ? historyTable.getRowModel().rows.map(row => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={returnHistoryColumns.length} className="h-24 text-center">No credit notes recorded yet.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
             <div className="py-4">
                <DataTablePagination table={historyTable} />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
