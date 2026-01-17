
'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears, startOfWeek, endOfWeek } from 'date-fns';
import type { Sale, CreditNote } from '../page';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee } from 'lucide-react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';


export function MarginOverviewCard({ salesData, isLoading: isSalesLoading }: { salesData: Sale[] | null, isLoading: boolean }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;
  
  const userDocRef = useMemoFirebase(() => (isDemoMode || !firestore || !user ? null : doc(firestore, `users/${user.uid}`)), [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  const creditNotesQuery = useMemoFirebase(() => (isDemoMode || !shopId || !firestore ? null : query(collection(firestore, `shops/${shopId}/creditNotes`))), [shopId, firestore, isDemoMode]);
  const { data: creditNotesData, isLoading: isCreditNotesLoading } = useCollection<CreditNote>(creditNotesQuery);

  const [timeRange, setTimeRange] = useState('today');

  const { totalProfit, totalRevenue } = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (timeRange) {
        case 'today':
            startDate = new Date(now.setHours(0,0,0,0));
            endDate = new Date(now.setHours(23,59,59,999));
            break;
        case 'this-week':
            startDate = startOfWeek(now);
            endDate = endOfWeek(now);
            break;
        case 'this-month':
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
        case 'last-3-months':
            startDate = startOfMonth(subMonths(now, 2));
            endDate = endOfMonth(now);
            break;
        case 'last-6-months':
            startDate = startOfMonth(subMonths(now, 5));
            endDate = endOfMonth(now);
            break;
        case 'this-year':
            startDate = startOfYear(now);
            endDate = endOfYear(now);
            break;
        case 'last-year':
            const lastYearDate = subYears(now, 1);
            startDate = startOfYear(lastYearDate);
            endDate = endOfYear(lastYearDate);
            break;
        default:
            startDate = startOfYear(now);
            endDate = endOfYear(now);
    }
    
    const filteredSales = (salesData || []).filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= endDate;
    });

    const filteredCreditNotes = (creditNotesData || []).filter(cn => {
        const cnDate = new Date(cn.date);
        return cnDate >= startDate && cnDate <= endDate;
    });

    let profit = 0;
    let revenue = 0;

    filteredSales.forEach(sale => {
        sale.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            const discountAmount = itemTotal * (item.discount / 100);
            const finalPrice = itemTotal - discountAmount;
            
            const itemProfit = finalPrice * (item.margin / 100);
            revenue += finalPrice;
            profit += itemProfit;
        });
    });

    filteredCreditNotes.forEach(cn => {
        cn.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            const discountAmount = itemTotal * (item.discount / 100);
            const finalPrice = itemTotal - discountAmount;

            const itemProfit = finalPrice * (item.margin / 100);
            revenue -= finalPrice;
            profit -= itemProfit;
        });
    });

    return { totalProfit: profit, totalRevenue: revenue };

  }, [salesData, creditNotesData, timeRange]);
  
  const marginPercentage = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const isLoading = isSalesLoading || isCreditNotesLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Profit Margin</CardTitle>
        <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{marginPercentage.toFixed(2)}%</div>}
         <p className="text-xs text-muted-foreground flex items-center gap-1">
            Profit of <IndianRupee className="h-3 w-3" />{totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })} from revenue of <IndianRupee className="h-3 w-3" />{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </p>
      </CardContent>
    </Card>
  );
}
