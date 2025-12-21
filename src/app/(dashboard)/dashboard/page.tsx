
'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { IndianRupee, PartyPopper } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { subDays } from 'date-fns';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { PaymentBreakdownCard } from './components/payment-breakdown-card';
import { MarginOverviewCard } from './components/margin-overview-card';
import { cn } from '@/lib/utils';
import { MonthlySalesChart } from './components/monthly-sales-chart';
import { TopProductsChart } from './components/top-products-chart';
import { Button } from '@/components/ui/button';


// Common Types
export type Sale = {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    phone?: string;
  };
  date: string;
  total: number;
  items: SaleItem[];
  paymentMode: 'cash' | 'card' | 'upi' | 'both';
  paymentDetails?: {
    cash?: number;
    card?: number;
    upi?: number;
  }
};

export type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  margin: number;
  sku?: string;
  hsn?: string;
  gst?: number;
};

export type ReportItem = SaleItem & {
  saleDate: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  invoiceNumbers: string[];
  lastPurchaseDate: string;
};

export type KhataEntry = {
    id: string;
    customerName: string;
    customerPhone: string;
    amount: number;
    notes: string;
    date: string;
    status: 'unpaid' | 'paid';
}

type UserProfile = {
  shopId?: string;
  subscriptionType?: 'New' | 'Renew';
};

// Demo Data
const demoSales: Sale[] = [
    { id: '1', invoiceNumber: 'INV123', date: new Date().toISOString(), customer: { name: 'Ravi Kumar', phone: '9876543210' }, total: 2500, paymentMode: 'upi', items: [{ productId: '1', name: 'T-Shirt', quantity: 2, price: 500, margin: 25, sku: 'TS-01', hsn: '6109', gst: 5 }, { productId: '2', name: 'Jeans', quantity: 1, price: 1500, margin: 30, sku: 'JN-01', hsn: '6203', gst: 5 }] },
    { id: '2', invoiceNumber: 'INV124', date: new Date(Date.now() - 86400000).toISOString(), customer: { name: 'Priya Sharma', phone: '9876543211' }, total: 1200, paymentMode: 'card', items: [{ productId: '3', name: 'Sneakers', quantity: 1, price: 1200, margin: 40, sku: 'SH-01', hsn: '6404', gst: 18 }] },
    { id: '3', invoiceNumber: 'INV125', date: new Date(Date.now() - 172800000).toISOString(), customer: { name: 'Amit Singh', phone: '9876543212' }, total: 3500, paymentMode: 'cash', items: [{ productId: '4', name: 'Watch', quantity: 1, price: 3500, margin: 50, sku: 'WT-01', hsn: '9102', gst: 18 }] },
];

export const demoCustomers: Customer[] = [
    { id: '1', name: 'Ravi Kumar', phone: '9876543210', invoiceNumbers: ['INV123', 'INV128'], lastPurchaseDate: new Date().toISOString() },
    { id: '2', name: 'Priya Sharma', phone: '9876543211', invoiceNumbers: ['INV124'], lastPurchaseDate: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', name: 'Amit Singh', phone: '9876543212', invoiceNumbers: ['INV125', 'INV129', 'INV130'], lastPurchaseDate: new Date(Date.now() - 172800000).toISOString() },
    { id: '4', name: 'Sunita Gupta', phone: '9876543213', invoiceNumbers: ['INV126'], lastPurchaseDate: new Date(Date.now() - 259200000).toISOString() },
    { id: '5', name: 'Vikas Patel', phone: '9876543214', invoiceNumbers: ['INV127'], lastPurchaseDate: new Date(Date.now() - 345600000).toISOString() },
];
const DemoData = {
    todaySales: 12345.67,
    thisMonthSales: 150000,
    thisYearSales: 1850000,
};

const LoadingComponent = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </CardContent>
  </Card>
);

const AllSalesTab = dynamic(() => import('./components/all-sales-tab').then(mod => mod.AllSalesTab), {
  loading: () => <LoadingComponent />,
});
const ReportsTab = dynamic(() => import('./components/reports-tab').then(mod => mod.ReportsTab), {
  loading: () => <LoadingComponent />,
});
const CustomersTab = dynamic(() => import('./components/customers-tab').then(mod => mod.CustomersTab), {
  loading: () => <LoadingComponent />,
});
const PaymentsTab = dynamic(() => import('./components/payments-tab').then(mod => mod.PaymentsTab), {
  loading: () => <LoadingComponent />,
});


// Main Dashboard Page
export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;
  const [activeTab, setActiveTab] = useState('overview');

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

  // We are removing the top-level data fetch. Data will be fetched within each tab.
  // const { data: allSalesData, isLoading: isAllSalesLoading } = useCollection<Sale>(salesCollectionRef);
  
  // For overview cards, we will still fetch some aggregated data, but we can optimize this later if needed.
  // For now, let's fetch all data just for the overview page, and let other tabs manage their own data.
  const { data: allSalesData, isLoading: isAllSalesLoading } = useCollection<Sale>(activeTab === 'overview' ? salesCollectionRef : null);

  const salesData = isDemoMode ? demoSales : allSalesData;
  const originalData = salesData || [];

  const {
      todaySales,
      thisMonthSales,
      thisYearSales,
      todayPaymentTotals,
      yesterdayPaymentTotals,
      allTimePaymentTotals,
  } = useMemo(() => {
      const todayStr = new Date().toDateString();
      const yesterdayStr = subDays(new Date(), 1).toDateString();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const calculateTotals = (data: Sale[]) => {
          return data.reduce((acc, sale) => {
              if (sale.paymentMode === 'both' && sale.paymentDetails) {
                  acc.cash += sale.paymentDetails.cash || 0;
                  acc.card += sale.paymentDetails.card || 0;
                  acc.upi += sale.paymentDetails.upi || 0;
              } else if (sale.paymentMode === 'cash' || sale.paymentMode === 'card' || sale.paymentMode === 'upi') {
                  acc[sale.paymentMode] = (acc[sale.paymentMode] || 0) + sale.total;
              }
              return acc;
          }, { cash: 0, card: 0, upi: 0 });
      };

      const todaySalesData = originalData.filter(s => new Date(s.date).toDateString() === todayStr);
      const yesterdaySalesData = originalData.filter(s => new Date(s.date).toDateString() === yesterdayStr);

      return {
          todaySales: todaySalesData.reduce((sum, s) => sum + s.total, 0),
          thisMonthSales: originalData.filter(s => new Date(s.date).getMonth() === currentMonth && new Date(s.date).getFullYear() === currentYear).reduce((sum, s) => sum + s.total, 0),
          thisYearSales: originalData.filter(s => new Date(s.date).getFullYear() === currentYear).reduce((sum, s) => sum + s.total, 0),
          todayPaymentTotals: calculateTotals(todaySalesData),
          yesterdayPaymentTotals: calculateTotals(yesterdaySalesData),
          allTimePaymentTotals: calculateTotals(originalData),
      };
  }, [originalData]);


  const isLoading = isAllSalesLoading && !isDemoMode;
  const isNewSubscriber = userData?.subscriptionType === 'New';

  return (
    <TooltipProvider>
    <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">
                {isDemoMode ? 'Dashboard (Demo Mode)' : 'Dashboard'}
            </h2>
        </div>
        
        {isNewSubscriber && (
            <Card className="bg-accent/50 border-primary/50">
                <CardHeader className="flex flex-row items-start gap-4">
                    <div className="p-3 rounded-full bg-primary/20 text-primary">
                        <PartyPopper className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle>Welcome to Apna Billing ERP!</CardTitle>
                        <CardDescription>Congratulations on your new subscription. We're thrilled to have you on board.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                       You're all set to start managing your business. The best place to start is by adding products to your inventory.
                    </p>
                    <Link href="/dashboard/inventory/add" passHref>
                        <Button>Add Your First Product</Button>
                    </Link>
                </CardContent>
            </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sales">All Sales</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Today's Sales</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">₹{todaySales.toLocaleString('en-IN')}</div>}
                        </CardContent>
                    </Card>
                    <MarginOverviewCard salesData={salesData} isLoading={isLoading} />
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">This Month's Sales</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">₹{thisMonthSales.toLocaleString('en-IN')}</div>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">This Year's Sales</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">₹{thisYearSales.toLocaleString('en-IN')}</div>}
                        </CardContent>
                    </Card>
                </div>
                 <div className="grid gap-4 md:grid-cols-3">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div onClick={() => setActiveTab('payments')} className="cursor-pointer">
                                <PaymentBreakdownCard title="Today's Payments" totals={todayPaymentTotals} isLoading={isLoading} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-bold">Click to see more data</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <div onClick={() => setActiveTab('payments')} className="cursor-pointer">
                                <PaymentBreakdownCard title="Yesterday's Payments" totals={yesterdayPaymentTotals} isLoading={isLoading} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-bold">Click to see more data</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div onClick={() => setActiveTab('payments')} className="cursor-pointer">
                                <PaymentBreakdownCard title="All-Time Totals" totals={allTimePaymentTotals} isLoading={isLoading}/>
                            </div>
                        </TooltipTrigger>
                         <TooltipContent>
                            <p className="font-bold">Click to see more data</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <MonthlySalesChart salesData={salesData} isLoading={isLoading} />
                    <TopProductsChart salesData={salesData} isLoading={isLoading} />
                </div>
            </TabsContent>
            <TabsContent value="sales">
                <AllSalesTab />
            </TabsContent>
            <TabsContent value="reports">
                <ReportsTab />
            </TabsContent>
            <TabsContent value="payments">
                <PaymentsTab />
            </TabsContent>
            <TabsContent value="customers">
                <CustomersTab isDemoMode={isDemoMode} />
            </TabsContent>
        </Tabs>
    </div>
    </TooltipProvider>
  );
}
