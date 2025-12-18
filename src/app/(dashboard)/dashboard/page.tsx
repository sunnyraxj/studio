
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { IndianRupee } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

type Sale = {
  id: string;
  total: number;
  date: string; // ISO string
  items: SaleItem[];
  customer: {
    name: string;
  };
  invoiceNumber: string;
};

type UserProfile = {
  shopId?: string;
}

const DemoData = {
    todaySales: 12345.67,
    thisMonthSales: 150000,
    thisYearSales: 1850000,
    recentSales: [
        { id: '1', date: new Date().toISOString(), invoiceNumber: 'INV123', customer: { name: 'Ravi Kumar' }, total: 2500, items: [{ productId: '1', name: 'T-Shirt', quantity: 2, price: 500 }, { productId: '2', name: 'Jeans', quantity: 1, price: 1500 }] },
        { id: '2', date: new Date(Date.now() - 86400000).toISOString(), invoiceNumber: 'INV124', customer: { name: 'Priya Sharma' }, total: 1200, items: [{ productId: '3', name: 'Sneakers', quantity: 1, price: 1200 }] },
        { id: '3', date: new Date(Date.now() - 172800000).toISOString(), invoiceNumber: 'INV125', customer: { name: 'Amit Singh' }, total: 3500, items: [{ productId: '4', name: 'Watch', quantity: 1, price: 3500 }] },
    ]
};

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);

  const { data: userData } = useDoc<UserProfile>(userDocRef);
  const shopId = userData?.shopId;

  const salesCollectionRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return collection(firestore, `shops/${shopId}/sales`);
  }, [shopId, firestore, isDemoMode]);

  const { data: allSalesData, isLoading: isAllSalesLoading } = useCollection<Sale>(salesCollectionRef);

  const recentSalesQuery = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return query(collection(firestore, `shops/${shopId}/sales`), orderBy('date', 'desc'), limit(5));
  }, [shopId, firestore, isDemoMode]);

  const { data: recentSalesData, isLoading: isRecentSalesLoading } = useCollection<Sale>(recentSalesQuery);

  // Calculate sales figures
  const todaySales = isDemoMode
    ? DemoData.todaySales
    : allSalesData
        ?.filter(sale => new Date(sale.date).toDateString() === new Date().toDateString())
        .reduce((sum, sale) => sum + sale.total, 0) || 0;

  const thisMonthSales = isDemoMode
    ? DemoData.thisMonthSales
    : allSalesData
        ?.filter(sale => new Date(sale.date).getMonth() === new Date().getMonth() && new Date(sale.date).getFullYear() === new Date().getFullYear())
        .reduce((sum, sale) => sum + sale.total, 0) || 0;
  
  const thisYearSales = isDemoMode
    ? DemoData.thisYearSales
    : allSalesData
        ?.filter(sale => new Date(sale.date).getFullYear() === new Date().getFullYear())
        .reduce((sum, sale) => sum + sale.total, 0) || 0;
  
  const recentSales = isDemoMode ? DemoData.recentSales : recentSalesData;
  const recentItemsSold = isDemoMode
    ? DemoData.recentSales.flatMap(s => s.items)
    : recentSalesData?.flatMap(s => s.items) || [];
  
  const isLoading = isAllSalesLoading || isRecentSalesLoading;

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
            {isDemoMode ? 'Dashboard (Demo Mode)' : 'Dashboard'}
        </h2>
      </div>

      {/* Overview Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold tracking-tight">Overview</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading && !isDemoMode ? <div className="text-2xl font-bold">Loading...</div> : <div className="text-2xl font-bold">₹{todaySales.toLocaleString('en-IN')}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                This Month's Sales
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               {isLoading && !isDemoMode ? <div className="text-2xl font-bold">Loading...</div> : <div className="text-2xl font-bold">₹{thisMonthSales.toLocaleString('en-IN')}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                This Year's Sales
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               {isLoading && !isDemoMode ? <div className="text-2xl font-bold">Loading...</div> : <div className="text-2xl font-bold">₹{thisYearSales.toLocaleString('en-IN')}</div>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold tracking-tight">Summary</h3>
        <div className="grid gap-6 lg:grid-cols-2">
           <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                  Your last 5 transactions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isRecentSalesLoading && !isDemoMode ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell></TableRow>
                    ) : recentSales && recentSales.length > 0 ? (
                      recentSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            <div className="font-medium">{sale.customer.name}</div>
                          </TableCell>
                          <TableCell>
                             <Badge variant="outline">{sale.invoiceNumber}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(sale.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right">₹{sale.total.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No recent sales.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Items Sold in Recent Sales</CardTitle>
                 <CardDescription>
                  Products included in your last 5 transactions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {isRecentSalesLoading && !isDemoMode ? (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center">Loading...</TableCell></TableRow>
                     ) : recentItemsSold && recentItemsSold.length > 0 ? (
                        recentItemsSold.map((item, index) => (
                            <TableRow key={`${item.productId}-${index}`}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">₹{item.price.toLocaleString('en-IN')}</TableCell>
                            </TableRow>
                        ))
                     ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">No items sold recently.</TableCell>
                        </TableRow>
                     )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
