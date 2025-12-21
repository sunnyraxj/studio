
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
  PaginationState,
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
import { X, Search, IndianRupee, CreditCard, Smartphone, Banknote, Calendar, TrendingUp, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { Sale } from '../page';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { PaymentBreakdownCard } from './payment-breakdown-card';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, orderBy, where, limit, getDocs, getCountFromServer, startAfter, Query, DocumentData } from 'firebase/firestore';


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
        if (mode === 'both') icon = <IndianRupee className="h-4 w-4 mr-2" />;
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


export function PaymentsTab() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;
  
  const salesCollectionRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return collection(firestore, `shops/${shopId}/sales`);
  }, [shopId, firestore, isDemoMode]);
  const { data: overviewSalesData, isLoading: isOverviewLoading } = useCollection<Sale>(salesCollectionRef);
  
  const [data, setData] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 30,
  });

  const [isFilterActive, setIsFilterActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDay, setStartDay] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endDay, setEndDay] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');
  
  const buildQuery = () => {
    if (!firestore || !shopId) return null;
    const baseRef = collection(firestore, `shops/${shopId}/sales`);
    let constraints = [];

    if (sorting.length > 0) {
        constraints.push(orderBy(sorting[0].id, sorting[0].desc ? 'desc' : 'asc'));
    } else {
        constraints.push(orderBy('date', 'desc'));
    }
    
    const startDateStr = `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
    const endDateStr = `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    if (!isNaN(startDate.getTime()) && startDay && startMonth && startYear) constraints.push(where('date', '>=', startDate.toISOString()));
    if (!isNaN(endDate.getTime()) && endDay && endMonth && endYear) constraints.push(where('date', '<=', endDate.toISOString()));
    if (searchTerm) constraints.push(where('customer.name', '>=', searchTerm), where('customer.name', '<=', searchTerm + '\uf8ff'));

    return query(baseRef, ...constraints);
  };
  
  const fetchData = async () => {
    const q = buildQuery();
    if (!q) return;

    setIsLoading(true);
    try {
      const countSnapshot = await getCountFromServer(q);
      setPageCount(Math.ceil(countSnapshot.data().count / pageSize));

      let finalQuery = query(q, limit(pageSize));
      if (pageIndex > 0 && lastVisible) {
        finalQuery = query(q, startAfter(lastVisible), limit(pageSize));
      }

      const querySnapshot = await getDocs(finalQuery);
      const sales = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      setData(sales);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
    } catch(e) { console.error(e) }
    finally { setIsLoading(false) }
  };
  
  useEffect(() => {
    if(!isDemoMode && shopId) fetchData();
  }, [shopId, pageIndex, pageSize, sorting, isFilterActive]);

  const originalData = overviewSalesData || [];

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

    const todaySales = todaySalesData.reduce((sum, s) => sum + s.total, 0);
    const yesterdaySales = yesterdaySalesData.reduce((sum, s) => sum + s.total, 0);
    const thisMonthSales = originalData.filter(s => new Date(s.date).getMonth() === currentMonth && new Date(s.date).getFullYear() === currentYear).reduce((sum, s) => sum + s.total, 0);
    
    return {
        filteredPaymentTotals: calculateTotals(originalData),
        todayPaymentTotals: calculateTotals(todaySalesData),
        yesterdayPaymentTotals: calculateTotals(yesterdaySalesData),
        todaySales,
        yesterdaySales,
        thisMonthSales
    };
  }, [originalData]);


  const handleFilter = () => {
    setPageIndex(0);
    setLastVisible(null);
    setIsFilterActive(prev => !prev);
  };
  
  const handleClearFilter = () => {
    setStartDay(''); setStartMonth(''); setStartYear('');
    setEndDay(''); setEndMonth(''); setEndYear('');
    setSearchTerm('');
    setPageIndex(0);
    setLastVisible(null);
    if(isFilterActive) {
      setIsFilterActive(prev => !prev);
    }
  }

  const isAnyFilterApplied = !!(searchTerm || startDay || endDay);
  
  const handleExport = () => {
    // This needs to be adapted to fetch all data for export, or export current view.
    const dataToExport = data.map(sale => ({
        'Invoice #': sale.invoiceNumber,
        'Date': format(new Date(sale.date), 'dd-MM-yyyy'),
        'Customer': sale.customer.name,
        'Payment Mode': sale.paymentMode,
        'Amount': sale.total,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments Report");
    XLSX.writeFile(workbook, `PaymentsReport-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }


  const table = useReactTable({
    data,
    columns: paymentColumns,
    pageCount,
    state: { sorting, pagination: { pageIndex, pageSize } },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <TooltipProvider>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Payments Received</CardTitle>
            <CardDescription>A list of all payments categorized by method.</CardDescription>
          </div>
           <div className="flex items-center gap-2">
             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search customer, invoice, mode..."
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
                <Button onClick={handleFilter} size="sm" className="self-end">Filter</Button>
                {isAnyFilterApplied && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 self-end" onClick={handleClearFilter}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear Filter</span>
                  </Button>
                )}
            </div>
            <Separator orientation="vertical" className="h-10 self-center" />
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" className="self-center" onClick={handleExport} disabled={table.getRowModel().rows.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" /> Export
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Downloads an Excel file of the currently shown payments.</p>
                </TooltipContent>
            </Tooltip>
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
            <PaymentBreakdownCard title="Today's Payments" totals={todayPaymentTotals} isLoading={isOverviewLoading} />
            <PaymentBreakdownCard title="Yesterday's Payments" totals={yesterdayPaymentTotals} isLoading={isOverviewLoading} />
            <PaymentBreakdownCard 
                title={isAnyFilterApplied ? "Filtered Totals" : "All-Time Totals"} 
                totals={filteredPaymentTotals}
                isLoading={isOverviewLoading}
                className={cn(
                    isAnyFilterApplied && "bg-accent/50 border-primary ring-2 ring-primary/50"
                )}
            />
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
    </TooltipProvider>
  );
}

    