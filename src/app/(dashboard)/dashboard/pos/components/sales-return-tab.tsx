
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, IndianRupee } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, doc } from 'firebase/firestore';
import type { Sale, SaleItem } from '../../page';
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

type ReturnItem = SaleItem & {
    returnQuantity: number;
};

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


  const handleProcessReturn = () => {
    // This is where you would handle the logic for the return:
    // 1. Create a sales return document.
    // 2. Adjust inventory stock for returned items.
    // 3. Issue a credit note or refund.
    toast({
        title: "Return Processed (Placeholder)",
        description: `A return for ${totalReturnValue.toFixed(2)} has been recorded.`
    })
    
    // Reset state after processing
    setInvoiceNumber('');
    setFoundSale(null);
    setReturnItems([]);
    setError(null);
  }

  return (
    <Card className="h-full">
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
                                value={item.returnQuantity}
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
  );
}
