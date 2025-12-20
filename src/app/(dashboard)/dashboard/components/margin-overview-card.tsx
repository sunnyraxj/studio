
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
import type { Sale } from '../page';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee } from 'lucide-react';


export function MarginOverviewCard({ salesData, isLoading }: { salesData: Sale[] | null, isLoading: boolean }) {
  const [timeRange, setTimeRange] = useState('today');

  const totalMargin = useMemo(() => {
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

    const margin = filteredSales.reduce((acc, sale) => {
        const saleMargin = sale.items.reduce((itemAcc, item) => {
            const itemRevenue = item.price * item.quantity;
            const itemProfit = itemRevenue * (item.margin / 100);
            return itemAcc + itemProfit;
        }, 0);
        return acc + saleMargin;
    }, 0);

    return margin;

  }, [salesData, timeRange]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Total Margin</CardTitle>
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
        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">₹{totalMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
      </CardContent>
    </Card>
  );
}
