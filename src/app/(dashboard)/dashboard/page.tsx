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
import { collection, doc } from 'firebase/firestore';

type Sale = {
  id: string;
  total: number;
  date: string; // ISO string
};

type UserProfile = {
  shopId?: string;
}

const DemoData = {
    todaySales: 12345.67,
    thisMonthSales: 150000,
    thisYearSales: 1850000,
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
  
  const isLoading = isAllSalesLoading;

  return (
    <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
                {isDemoMode ? 'Dashboard (Demo Mode)' : 'Dashboard'}
            </h2>
        </div>
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
  );
}
