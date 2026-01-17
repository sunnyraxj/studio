
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, IndianRupee } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, getDocs, limit, doc, addDoc, orderBy, runTransaction } from 'firebase/firestore';
import type { Sale, SaleItem, SalesReturn } from '../../page';
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
import { Separator } from '@/components/ui/separator';
import { DataTablePagination } from '@/components/data-table-pagination';
import type { ColumnDef } from '@tanstack/react-table';
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';

type ReturnItem = SaleItem & {
    returnQuantity: number;
};

const returnHistoryColumns: ColumnDef<SalesReturn>[] = [
  {
    accessorKey: 'returnDate',
    header: 'Return Date',
    cell: ({ row }) => format(new Date(row.getValue('returnDate')), 'dd MMM, yyyy'),
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
    accessorKey: 'totalReturnValue',
    header: () => <div className="text-right">Return Value</div>,
    cell: ({ row }) => <div className="text-right font-semibold flex items-center justify-end gap-1"><IndianRupee className="h-4 w-4" />{row.original.totalReturnValue.toLocaleString('en-IN')}</div>
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

  const salesReturnsQuery = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return query(collection(firestore, `shops/${shopId}/salesReturns`), orderBy('returnDate', 'desc'));
  }, [shopId, firestore, isDemoMode]);

  const { data: salesReturnsData, isLoading: isReturnsLoading } = useCollection<SalesReturn>(salesReturnsQuery);
  const [demoSalesReturns, setDemoSalesReturns] = useState<SalesReturn[]>([]);

  const returnsHistory = isDemoMode ? demoSalesReturns : (salesReturnsData || []);

  const historyTable = useReactTable({
      data: returnsHistory,
      columns: returnHistoryColumns,
      getCoreRowModel: getCoreRowModel(),
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
          const newQuantity = Math.max(0, Math.min(quantity, maxQuantity));
          return { ...item, returnQuantity: newQuantity };
        }
        return item;
      })
    );
  };
  
  const totalReturnValue = useMemo(() => {
    return returnItems.reduce((total, item) => {
      // Assuming price is the final price after discount for simplicity
      const itemPrice = item.price - (item.price * (item.discount / 100));
      return total + itemPrice * item.returnQuantity;
    }, 0);
  }, [returnItems]);


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
            const returnDocRef = doc(collection(firestore, `shops/${shopId}/salesReturns`));

            // 1. Get the original sale document
            const saleDoc = await transaction.get(saleDocRef);
            if (!saleDoc.exists()) {
                throw "Original sale document not found!";
            }
            const originalSaleData = saleDoc.data() as Sale;

            // 2. Prepare the new SalesReturn document's items
            const newReturnedItemsList = returnItems
                .filter(item => item.returnQuantity > 0)
                .map(item => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: item.returnQuantity,
                    price: item.price,
                    discount: item.discount,
                    margin: item.margin,
                    sku: item.sku,
                    hsn: item.hsn,
                    gst: item.gst,
                }));
            
            // Prepare the new SalesReturn document
            const newReturnData: Omit<SalesReturn, 'id'> = {
              originalSaleId: foundSale.id,
              originalInvoiceNumber: foundSale.invoiceNumber,
              returnDate: new Date().toISOString(),
              customer: { name: foundSale.customer.name, phone: foundSale.customer.phone },
              returnedItems: newReturnedItemsList,
              totalReturnValue,
            };

            // 3. Create the new SalesReturn document
            transaction.set(returnDocRef, newReturnData);

            // 4. Update the original Sale document
            const allReturnedItems = [...(originalSaleData.returnedItems || []), ...newReturnedItemsList];

            const originalQuantities: Record<string, number> = {};
            originalSaleData.items.forEach(item => {
                originalQuantities[item.productId] = (originalQuantities[item.productId] || 0) + item.quantity;
            });

            const returnedQuantities: Record<string, number> = {};
            allReturnedItems.forEach(item => {
                returnedQuantities[item.productId] = (returnedQuantities[item.productId] || 0) + item.quantity;
            });

            const isFullyReturned = Object.keys(originalQuantities).every(
                productId => (returnedQuantities[productId] || 0) >= originalQuantities[productId]
            );

            const newStatus = isFullyReturned ? 'Fully Returned' : 'Partially Returned';
            
            transaction.update(saleDocRef, {
                status: newStatus,
                returnedItems: allReturnedItems,
            });
        });

        toast({
            title: 'Return Processed',
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
          <CardTitle>Process a Sales Return</CardTitle>
          <CardDescription>
            Enter an invoice number to find the sale and process a return or exchange.
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
                      Process Return
                    </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Return History</CardTitle>
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
                        {isReturnsLoading ? <TableRow><TableCell colSpan={returnHistoryColumns.length} className="h-24 text-center">Loading history...</TableCell></TableRow>
                        : historyTable.getRowModel().rows?.length ? historyTable.getRowModel().rows.map(row => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={returnHistoryColumns.length} className="h-24 text-center">No returns recorded yet.</TableCell></TableRow>}
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
