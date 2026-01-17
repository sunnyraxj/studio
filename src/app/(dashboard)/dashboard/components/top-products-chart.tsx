
'use client';

import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from 'date-fns';
import type { Sale, CreditNote } from '../page';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';


const chartConfig = {
  quantity: {
    label: 'Quantity',
    color: 'hsl(var(--primary))',
  },
};

export function TopProductsChart({ salesData, isLoading: isSalesLoading }: { salesData: Sale[] | null, isLoading: boolean }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;
  
  const userDocRef = useMemoFirebase(() => (isDemoMode || !firestore || !user ? null : doc(firestore, `users/${user.uid}`)), [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  const creditNotesQuery = useMemoFirebase(() => (isDemoMode || !shopId || !firestore ? null : query(collection(firestore, `shops/${shopId}/creditNotes`))), [shopId, firestore, isDemoMode]);
  const { data: creditNotesData, isLoading: isCreditNotesLoading } = useCollection<CreditNote>(creditNotesQuery);

  const [timeRange, setTimeRange] = useState('this-year');

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfMonth(now);

    switch (timeRange) {
      case 'this-month':
        startDate = startOfMonth(now);
        break;
      case 'last-3-months':
        startDate = startOfMonth(subMonths(now, 2));
        break;
      case 'last-6-months':
        startDate = startOfMonth(subMonths(now, 5));
        break;
      case 'this-year':
        startDate = startOfYear(now);
        break;
      case 'last-year':
        const lastYearDate = subYears(now, 1);
        startDate = startOfYear(lastYearDate);
        endDate = endOfYear(lastYearDate);
        break;
      default:
        startDate = startOfYear(now);
    }

    const filteredSales = (salesData || []).filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= endDate;
    });

    const filteredCreditNotes = (creditNotesData || []).filter(cn => {
        const cnDate = new Date(cn.date);
        return cnDate >= startDate && cnDate <= endDate;
    });

    const productQuantities: { [key: string]: number } = {};

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productQuantities[item.name]) {
          productQuantities[item.name] = 0;
        }
        productQuantities[item.name] += item.quantity;
      });
    });

    filteredCreditNotes.forEach(cn => {
      cn.items.forEach(item => {
        if (productQuantities[item.name]) {
          productQuantities[item.name] -= item.quantity;
        }
      });
    });

    return Object.entries(productQuantities)
      .map(([name, quantity]) => ({ name, quantity }))
      .filter(p => p.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5); // Get top 5 products
  }, [salesData, creditNotesData, timeRange]);

  const isLoading = isSalesLoading || isCreditNotesLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Top Selling Products</CardTitle>
          <CardDescription>Highest selling units by quantity.</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a time range" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="h-[300px] w-full">
                <Skeleton className="h-full w-full" />
            </div>
        ) : (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart accessibilityLayer data={chartData} layout="vertical">
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={100}
              tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
            />
            <XAxis dataKey="quantity" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="quantity"
              fill="var(--color-quantity)"
              radius={5}
              layout="vertical"
            />
          </BarChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
