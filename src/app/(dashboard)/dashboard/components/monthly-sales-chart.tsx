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
import { subMonths, startOfMonth, endOfMonth, format, startOfYear, endOfYear, subYears, eachDayOfInterval, isValid } from 'date-fns';
import type { Sale, CreditNote } from '../page';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee } from 'lucide-react';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useTranslation } from '@/hooks/use-translation';

const chartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
};

export function MonthlySalesChart({ salesData, isLoading: isSalesLoading }: { salesData: Sale[] | null, isLoading: boolean }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;
  const { t } = useTranslation();
  
  const userDocRef = useMemoFirebase(() => (isDemoMode || !firestore || !user ? null : doc(firestore, `users/${user.uid}`)), [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  const creditNotesQuery = useMemoFirebase(() => (isDemoMode || !shopId || !firestore ? null : query(collection(firestore, `shops/${shopId}/creditNotes`))), [shopId, firestore, isDemoMode]);
  const { data: creditNotesData, isLoading: isCreditNotesLoading } = useCollection<CreditNote>(creditNotesQuery);
  
  const [timeRange, setTimeRange] = useState('this-month');

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

    const dailySales: { [key: string]: number } = {};

    if (isValid(startDate) && isValid(endDate)) {
        const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
        dateInterval.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            dailySales[dayKey] = 0;
        });
    }

    filteredSales.forEach(sale => {
      const dayKey = format(new Date(sale.date), 'yyyy-MM-dd');
      if (dailySales.hasOwnProperty(dayKey)) {
          dailySales[dayKey] += sale.total;
      }
    });

    filteredCreditNotes.forEach(cn => {
      const dayKey = format(new Date(cn.date), 'yyyy-MM-dd');
      if (dailySales.hasOwnProperty(dayKey)) {
          dailySales[dayKey] += cn.totalAmount; // Add because it's already negative
      }
    });

    return Object.keys(dailySales).map(date => ({
      date: date,
      sales: dailySales[date],
    }));
  }, [salesData, creditNotesData, timeRange]);

  const isLoading = isSalesLoading || isCreditNotesLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>{t('Daily Sales Overview')}</CardTitle>
            <CardDescription>{t('A summary of sales over time.')}</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('Select a time range')} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="this-month">{t('This Month')}</SelectItem>
                <SelectItem value="last-3-months">{t('Last 3 Months')}</SelectItem>
                <SelectItem value="last-6-months">{t('Last 6 Months')}</SelectItem>
                <SelectItem value="this-year">{t('This Year')}</SelectItem>
                <SelectItem value="last-year">{t('Last Year')}</SelectItem>
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
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => format(new Date(value), 'dd MMM')}
            />
            <YAxis
              tickFormatter={(value) => {
                  const num = Number(value);
                  if (num >= 100000) return `${num / 100000}L`;
                  if (num >= 1000) return `${num / 1000}k`;
                  return `${num}`;
              }}
              tickLine={false}
              axisLine={false}
              tickPrefix="₹"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent
                labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                        return format(new Date(payload[0].payload.date), 'EEE, dd MMM yyyy');
                    }
                    return label;
                }}
                formatter={(value) => 
                    <div className="flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        {Number(value).toLocaleString('en-IN')}
                    </div>
                }
                />}
            />
            <Bar dataKey="sales" fill="var(--color-sales)" radius={8} />
          </BarChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
