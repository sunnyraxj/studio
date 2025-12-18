
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-range-picker';
import { IndianRupee } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

// A placeholder type for your sales data
type Sale = {
  id: string;
  amount: number;
  date: string; // ISO string
};

type UserProfile = {
  shopId?: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);

  const { data: userData } = useDoc<UserProfile>(userDocRef);
  const shopId = userData?.shopId;

  // A memoized reference to the sales collection
  const salesCollectionRef = useMemoFirebase(() => {
    if (!shopId || !firestore) return null;
    return collection(firestore, `shops/${shopId}/sales`);
  }, [shopId, firestore]);

  const { data: salesData, isLoading } = useCollection<Sale>(salesCollectionRef);

  // Example logic to calculate sales figures - replace with your own logic
  const todaySales = salesData
    ?.filter(sale => new Date(sale.date).toDateString() === new Date().toDateString())
    .reduce((sum, sale) => sum + sale.amount, 0) || 0;

  const thisMonthSales = salesData
    ?.filter(sale => new Date(sale.date).getMonth() === new Date().getMonth() && new Date(sale.date).getFullYear() === new Date().getFullYear())
    .reduce((sum, sale) => sum + sale.amount, 0) || 0;


  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Production Dashboard</h2>
        <div className="flex items-center space-x-2">
          <DatePicker />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="text-2xl font-bold">Loading...</div> : <div className="text-2xl font-bold">₹{todaySales.toLocaleString('en-IN')}</div>}
            <p className="text-xs text-muted-foreground">
              Live data from your store
            </p>
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
             {isLoading ? <div className="text-2xl font-bold">Loading...</div> : <div className="text-2xl font-bold">₹{thisMonthSales.toLocaleString('en-IN')}</div>}
            <p className="text-xs text-muted-foreground">
              Live data from your store
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Date Range Sales
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">₹0.00</div>
            <p className="text-xs text-muted-foreground">
              Select a date range to see sales
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
