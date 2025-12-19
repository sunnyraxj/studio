
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Badge } from '@/components/ui/badge';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { X, Search, IndianRupee, CreditCard, Smartphone, Banknote, Calendar, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { Sale } from '../page';


const paymentColumns: ColumnDef<Sale>[] = [
  {
    accessorKey: 'invoiceNumber',
    header: 'Invoice #',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('invoiceNumber')}</Badge>,
  },
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Date <CaretSortIcon className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => format(new Date(row.getValue('date')), 'dd MMM yyyy'),
  },
  {
    accessorKey: 'customer.name',
    header: 'Customer',
    cell: ({ row }) => <div className="font-medium">{row.original.customer.name}</div>,
  },
  {
    accessorKey: 'paymentMode',
    header: 'Payment Mode',
    cell: ({ row }) => {
        const mode = row.getValue('paymentMode') as string;
        let icon = <Banknote className="h-4 w-4 mr-2" />;
        if (mode === 'card') icon = <CreditCard className="h-4 w-4 mr-2" />;
        if (mode === 'upi') icon = <Smartphone className="h-4 w-4 mr-2" />;
        return <div className="flex items-center capitalize">{icon}{mode}</div>
    },
  },
  {
    accessorKey: 'total',
    header: ({ column }) => (
      <Button variant="ghost" className='w-full justify-end' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Amount <CaretSortIcon className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right font-semibold">₹{row.original.total.toLocaleString('en-IN')}</div>,
  },
];

const PaymentBreakdownCard = ({ title, totals }: { title: string, totals: { cash: number; card: number; upi: number; } }) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center text-sm">
                    <Banknote className="h-4 w-4 mr-2 text-muted-foreground" />
                    Cash
                </div>
                <div className="font-semibold">₹{totals.cash.toLocaleString('en-IN')}</div>
            </div>
                <div className="flex items-center justify-between">
                <div className="flex items-center text-sm">
                    <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                    Card
                </div>
                <div className="font-semibold">₹{totals.card.toLocaleString('en-IN')}</div>
            </div>
                <div className="flex items-center justify-between">
                <div className="flex items-center text-sm">
                    <Smartphone className="h-4 w-4 mr-2 text-muted-foreground" />
                    UPI
                </div>
                <div className="font-semibold">₹{totals.upi.toLocaleString('en-IN')}</div>
            </div>
        </CardContent>
    </Card>
);

export function PaymentsTab({ salesData, isLoading }: { salesData: Sale[] | null, isLoading: boolean }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [filteredData, setFilteredData] = useState<Sale[]>([]);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [startDay, setStartDay] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endDay, setEndDay] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');
  
  const originalData = useMemo(() => salesData || [], [salesData]);

  useEffect(() => {
    let data = originalData;

    // Date filtering
    const startDateStr = `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
    const endDateStr = `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const isValidStartDate = !isNaN(startDate.getTime()) && startDay && startMonth && startYear;
    const isValidEndDate = !isNaN(endDate.getTime()) && endDay && endMonth && endYear;
    
    let applied = false;
    if (isFilterApplied) {
        if (isValidStartDate) {
            data = data.filter(item => new Date(item.date) >= startDate);
            applied = true;
        }
        if (isValidEndDate) {
            data = data.filter(item => new Date(item.date) <= endDate);
            applied = true;
        }
    }
    
    // Search filtering
    if (searchTerm) {
        data = data.filter(sale => 
            sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sale.paymentMode.toLowerCase().includes(searchTerm.toLowerCase())
        );
        applied = true;
    }

    setFilteredData(data);
    setIsFilterApplied(applied || !!searchTerm || (isFilterApplied && (isValidStartDate || isValidEndDate)));

  },[originalData, startDay, startMonth, startYear, endDay, endMonth, endYear, searchTerm, isFilterApplied]);

  const {
    filteredPaymentTotals,
    todayPaymentTotals,
    yesterdayPaymentTotals,
    todaySales,
    yesterdaySales,
    thisMonthSales
  } = useMemo(() => {
    const todayStr = new Date().toDateString();
    const yesterdayStr = subDays(new Date(), 1).toDateString();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const calculateTotals = (data: Sale[]) => {
        return data.reduce((acc, sale) => {
            acc[sale.paymentMode] = (acc[sale.paymentMode] || 0) + sale.total;
            return acc;
        }, { cash: 0, card: 0, upi: 0 });
    };

    const todaySalesData = originalData.filter(s => new Date(s.date).toDateString() === todayStr);
    const yesterdaySalesData = originalData.filter(s => new Date(s.date).toDateString() === yesterdayStr);

    const todaySales = todaySalesData.reduce((sum, s) => sum + s.total, 0);
    const yesterdaySales = yesterdaySalesData.reduce((sum, s) => sum + s.total, 0);
    const thisMonthSales = originalData.filter(s => new Date(s.date).getMonth() === currentMonth && new Date(s.date).getFullYear() === currentYear).reduce((sum, s) => sum + s.total, 0);
    
    const dataForFilteredTotals = isFilterApplied ? filteredData : originalData;

    return {
        filteredPaymentTotals: calculateTotals(dataForFilteredTotals),
        todayPaymentTotals: calculateTotals(todaySalesData),
        yesterdayPaymentTotals: calculateTotals(yesterdaySalesData),
        todaySales,
        yesterdaySales,
        thisMonthSales
    };

  }, [filteredData, originalData, isFilterApplied]);


  const handleFilter = () => {
    setIsFilterApplied(true);
  };
  
  const handleClearFilter = () => {
    setStartDay('');
    setStartMonth('');
    setStartYear('');
    setEndDay('');
    setEndMonth('');
    setEndYear('');
    setSearchTerm('');
    setIsFilterApplied(false);
  }

  const table = useReactTable({
    data: filteredData,
    columns: paymentColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Payments Received</CardTitle>
            <CardDescription>A list of all payments categorized by method.</CardDescription>
          </div>
           <div className="flex items-center gap-4">
             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by customer, invoice, mode..."
                    className="pl-8 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-end gap-2 p-2 border rounded-lg bg-muted/50">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Start Date</Label>
                  <div className="flex gap-1">
                      <Input placeholder="DD" value={startDay} onChange={e => setStartDay(e.target.value)} className="w-12 h-8" />
                      <Input placeholder="MM" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="w-12 h-8" />
                      <Input placeholder="YYYY" value={startYear} onChange={e => setStartYear(e.target.value)} className="w-20 h-8" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">End Date</Label>
                   <div className="flex gap-1">
                      <Input placeholder="DD" value={endDay} onChange={e => setEndDay(e.target.value)} className="w-12 h-8" />
                      <Input placeholder="MM" value={endMonth} onChange={e => setEndMonth(e.target.value)} className="w-12 h-8" />
                      <Input placeholder="YYYY" value={endYear} onChange={e => setEndYear(e.target.value)} className="w-20 h-8" />
                  </div>
                </div>
                <Button onClick={handleFilter} size="sm">Filter</Button>
                {isFilterApplied && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearFilter}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear Filter</span>
                  </Button>
                )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-4">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Sales (Today)</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">₹{todaySales.toLocaleString('en-IN')}</div>
                  </CardContent>
              </Card>
               <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Sales (Yesterday)</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">₹{yesterdaySales.toLocaleString('en-IN')}</div>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Sales (This Month)</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">₹{thisMonthSales.toLocaleString('en-IN')}</div>
                  </CardContent>
              </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <PaymentBreakdownCard title="Today's Payments" totals={todayPaymentTotals} />
            <PaymentBreakdownCard title="Yesterday's Payments" totals={yesterdayPaymentTotals} />
            <PaymentBreakdownCard title="Filtered Totals" totals={filteredPaymentTotals} />
          </div>
          <Separator />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={paymentColumns.length} className="h-24 text-center">Loading payments...</TableCell></TableRow>
                : table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                )) : <TableRow><TableCell colSpan={paymentColumns.length} className="h-24 text-center">No payments found for the selected criteria.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="py-4"><DataTablePagination table={table} /></div>
      </CardContent>
    </Card>
  );
}
