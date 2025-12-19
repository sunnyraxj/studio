
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
import { subMonths, startOfMonth, endOfMonth, format, startOfYear, endOfYear, subYears } from 'date-fns';
import type { Sale } from '../page';
import { Skeleton } from '@/components/ui/skeleton';


const chartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
};

export function MonthlySalesChart({ salesData, isLoading }: { salesData: Sale[] | null, isLoading: boolean }) {
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

    const monthlySales: { [key: string]: number } = {};

    filteredSales.forEach(sale => {
      const month = format(new Date(sale.date), 'MMM yyyy');
      if (!monthlySales[month]) {
        monthlySales[month] = 0;
      }
      monthlySales[month] += sale.total;
    });

    const sortedMonths = Object.keys(monthlySales).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return sortedMonths.map(month => ({
      month: format(new Date(month), 'MMM'),
      sales: monthlySales[month],
    }));
  }, [salesData, timeRange]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Monthly Sales Overview</CardTitle>
            <CardDescription>A summary of sales over time.</CardDescription>
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
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              tickFormatter={(value) => `₹${Number(value) / 1000}k`}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent
                labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                        return `${payload[0].payload.month}`;
                    }
                    return label;
                }}
                formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
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
