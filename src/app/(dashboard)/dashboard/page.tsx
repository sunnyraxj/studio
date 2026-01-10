
'use client';

import React, { useMemo, useState, useEffect, Suspense } from 'react';
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
import { IndianRupee, PartyPopper, Percent } from 'lucide-react';
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

export type Sale = {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    phone?: string;
    address?: string;
    pin?: string;
    state?: string;
    gstin?: string;
  };
  date: string;
  total: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  items: SaleItem[];
  paymentMode: 'cash' | 'card' | 'upi' | 'both';
  paymentDetails?: {
    cash?: number;
    card?: number;
    upi?: number;
  }
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
    type: 'credit' | 'payment';
}

type UserProfile = {
  shopId?: string;
  subscriptionType?: 'New' | 'Renew';
};

// Demo Data
const initialDemoSales: Sale[] = [
    { id: '1', invoiceNumber: 'D-INV-001', customer: { name: 'Ravi Kumar', phone: '9876543210', state: 'Assam', gstin: '18ABCDE1234F1Z5' }, date: new Date().toISOString(), total: 2625, subtotal: 2500, cgst: 62.5, sgst: 62.5, igst: 0, items: [{ productId: '1', name: 'T-Shirt', quantity: 2, price: 500, margin: 25, sku: 'TS-01', hsn: '6109', gst: 5 }, { productId: '2', name: 'Jeans', quantity: 1, price: 1500, margin: 30, sku: 'JN-01', hsn: '6203', gst: 5 }], paymentMode: 'cash' },
    { id: '2', invoiceNumber: 'D-INV-002', date: new Date(Date.now() - 86400000).toISOString(), customer: { name: 'Priya Sharma', phone: '9876543211', state: 'Delhi' }, total: 1416, subtotal: 1200, cgst: 0, sgst: 0, igst: 216, items: [{ productId: '3', name: 'Sneakers', quantity: 1, price: 1200, margin: 40, sku: 'SH-01', hsn: '6404', gst: 18 }], paymentMode: 'card' },
    { id: '3', invoiceNumber: 'D-INV-003', date: new Date(Date.now() - 172800000).toISOString(), customer: { name: 'Amit Singh', phone: '9876543212', state: 'Assam' }, total: 4130, subtotal: 3500, cgst: 315, sgst: 315, igst: 0, items: [{ productId: '4', name: 'Watch', quantity: 1, price: 3500, margin: 50, sku: 'WT-01', hsn: '9102', gst: 18 }], paymentMode: 'upi' },
    { id: '4', invoiceNumber: 'D-INV-004', date: new Date().toISOString(), customer: { name: 'Sunita Gupta', state: 'Assam' }, total: 5000, subtotal: 5000, cgst: 0, sgst: 0, igst: 0, paymentMode: 'both', items: [], paymentDetails: { cash: 2000, card: 3000 } },
];

export const demoCustomers: Customer[] = [
    { id: '1', name: 'Ravi Kumar', phone: '9876543210', invoiceNumbers: ['D-INV-001'], lastPurchaseDate: new Date().toISOString() },
    { id: '2', name: 'Priya Sharma', phone: '9876543211', invoiceNumbers: ['D-INV-002'], lastPurchaseDate: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', name: 'Amit Singh', phone: '9876543212', invoiceNumbers: ['D-INV-003'], lastPurchaseDate: new Date(Date.now() - 172800000).toISOString() },
    { id: '4', name: 'Sunita Gupta', phone: '9876543213', invoiceNumbers: ['D-INV-004'], lastPurchaseDate: new Date().toISOString() },
];

const initialDemoKhata: KhataEntry[] = [
    { id: 'k1', customerName: 'Rohan Sharma', customerPhone: '9876543210', amount: 1500, notes: 'Groceries', date: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'unpaid', type: 'credit' },
    { id: 'k2', customerName: 'Priya Patel', customerPhone: '9876543211', amount: 800, notes: '2 T-shirts', date: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'unpaid', type: 'credit' },
    { id: 'k3', customerName: 'Rohan Sharma', customerPhone: '9876543210', amount: -500, notes: 'Paid back a bit', date: new Date(Date.now() - 86400000 * 1).toISOString(), status: 'paid', type: 'payment' },
];


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
  ssr: false,
});
const ReportsTab = dynamic(() => import('./components/reports-tab').then(mod => mod.ReportsTab), {
  loading: () => <LoadingComponent />,
  ssr: false,
});
const CustomersTab = dynamic(() => import('./components/customers-tab').then(mod => mod.CustomersTab), {
  loading: () => <LoadingComponent />,
  ssr: false,
});
const PaymentsTab = dynamic(() => import('./components/payments-tab').then(mod => mod.PaymentsTab), {
  loading: () => <LoadingComponent />,
  ssr: false,
});
const GstTab = dynamic(() => import('./components/gst-tab').then(mod => mod.GstTab), {
  loading: () => <LoadingComponent />,
  ssr: false,
});
const KhataBookPage = dynamic(() => import('./khata/page'), {
  loading: () => <LoadingComponent />,
  ssr: false,
});


// Main Dashboard Page
export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;
  const [activeTab, setActiveTab] = useState('overview');
  
  // Centralized state for demo data
  const [demoSales, setDemoSales] = useState<Sale[]>(initialDemoSales);
  const [demoKhataEntries, setDemoKhataEntries] = useState<KhataEntry[]>(initialDemoKhata);


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
  
  const { data: overviewSalesData, isLoading: isOverviewLoading } = useCollection<Sale>(salesCollectionRef);

  const salesData = isDemoMode ? demoSales : overviewSalesData;
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


  const isLoading = isOverviewLoading && !isDemoMode;
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
                <TabsTrigger value="gst">GST Reports</TabsTrigger>
                <TabsTrigger value="khata">Khata Book</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Today's Sales</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold flex items-center gap-1"><IndianRupee className="h-6 w-6"/>{todaySales.toLocaleString('en-IN')}</div>}
                        </CardContent>
                    </Card>
                    <MarginOverviewCard salesData={salesData} isLoading={isLoading} />
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">This Month's Sales</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold flex items-center gap-1"><IndianRupee className="h-6 w-6"/>{thisMonthSales.toLocaleString('en-IN')}</div>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">This Year's Sales</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold flex items-center gap-1"><IndianRupee className="h-6 w-6"/>{thisYearSales.toLocaleString('en-IN')}</div>}
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
                <Suspense fallback={<LoadingComponent />}>
                    {activeTab === 'sales' && <AllSalesTab isDemoMode={isDemoMode} demoSales={demoSales} setDemoSales={setDemoSales} />}
                </Suspense>
            </TabsContent>
            <TabsContent value="reports">
                 <Suspense fallback={<LoadingComponent />}>
                    {activeTab === 'reports' && <ReportsTab isDemoMode={isDemoMode} demoSales={demoSales} />}
                </Suspense>
            </TabsContent>
            <TabsContent value="payments">
                 <Suspense fallback={<LoadingComponent />}>
                    {activeTab === 'payments' && <PaymentsTab isDemoMode={isDemoMode} demoSales={demoSales} />}
                </Suspense>
            </TabsContent>
            <TabsContent value="customers">
                 <Suspense fallback={<LoadingComponent />}>
                    {activeTab === 'customers' && <CustomersTab isDemoMode={isDemoMode} demoSales={demoSales} />}
                </Suspense>
            </TabsContent>
            <TabsContent value="gst">
                 <Suspense fallback={<LoadingComponent />}>
                    {activeTab === 'gst' && <GstTab isDemoMode={isDemoMode} demoSales={demoSales} />}
                </Suspense>
            </TabsContent>
             <TabsContent value="khata">
                 <Suspense fallback={<LoadingComponent />}>
                    {activeTab === 'khata' && <KhataBookPage isDemoMode={isDemoMode} demoKhataEntries={demoKhataEntries} setDemoKhataEntries={setDemoKhataEntries} />}
                </Suspense>
            </TabsContent>
        </Tabs>
    </div>
    </TooltipProvider>
  );
}
