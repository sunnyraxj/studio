
'use client';

import React, { useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  SortingState,
  ExpandedState,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { CaretSortIcon, ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { IndianRupee } from 'lucide-react';

// Common Types
type Sale = {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
  };
  date: string;
  total: number;
  items: SaleItem[];
};

type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

type ReportItem = SaleItem & {
  saleDate: string;
};

type UserProfile = {
  shopId?: string;
};

// Demo Data
const demoSales: Sale[] = [
    { id: '1', invoiceNumber: 'INV123', date: new Date().toISOString(), customer: { name: 'Ravi Kumar' }, total: 2500, items: [{ productId: '1', name: 'T-Shirt', quantity: 2, price: 500 }, { productId: '2', name: 'Jeans', quantity: 1, price: 1500 }] },
    { id: '2', invoiceNumber: 'INV124', date: new Date(Date.now() - 86400000).toISOString(), customer: { name: 'Priya Sharma' }, total: 1200, items: [{ productId: '3', name: 'Sneakers', quantity: 1, price: 1200 }] },
    { id: '3', invoiceNumber: 'INV125', date: new Date(Date.now() - 172800000).toISOString(), customer: { name: 'Amit Singh' }, total: 3500, items: [{ productId: '4', name: 'Watch', quantity: 1, price: 3500 }] },
];
const DemoData = {
    todaySales: 12345.67,
    thisMonthSales: 150000,
    thisYearSales: 1850000,
};

// All Sales Tab Component
const salesColumns: ColumnDef<Sale>[] = [
  {
    id: 'expander',
    header: () => null,
    cell: ({ row }) => {
      return row.getCanExpand() ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={row.getToggleExpandedHandler()}
          className="h-6 w-6"
        >
          {row.getIsExpanded() ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </Button>
      ) : null;
    },
  },
  {
    accessorKey: 'invoiceNumber',
    header: 'Invoice #',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('invoiceNumber')}</Badge>,
  },
  {
    accessorKey: 'customer.name',
    header: 'Customer',
    cell: ({ row }) => <div className="font-medium">{row.original.customer.name}</div>,
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
    accessorKey: 'total',
    header: ({ column }) => (
      <Button variant="ghost" className='w-full justify-end' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Amount <CaretSortIcon className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right font-semibold">₹{row.original.total.toLocaleString('en-IN')}</div>,
  },
];

function AllSalesTab({ salesData, isLoading }: { salesData: Sale[] | null, isLoading: boolean }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const filteredSalesData = useMemo(() => {
    let sales = salesData;
    if (!sales) return [];
    if (dateRange?.from) {
      sales = sales.filter(sale => new Date(sale.date) >= dateRange.from!);
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999); // Include the whole end day
      sales = sales.filter(sale => new Date(sale.date) <= toDate);
    }
    return sales;
  }, [salesData, dateRange]);

  const table = useReactTable({
    data: filteredSalesData,
    columns: salesColumns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>All Sales</CardTitle>
            <CardDescription>A complete list of all your transactions.</CardDescription>
          </div>
          <DateRangePicker onDateChange={setDateRange} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={salesColumns.length} className="h-24 text-center">Loading sales...</TableCell></TableRow>
                : table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => (
                  <React.Fragment key={row.id}>
                    <TableRow data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {row.getIsExpanded() && (
                      <TableRow>
                        <TableCell colSpan={salesColumns.length} className="p-0">
                          <div className="p-4 bg-muted/50">
                            <h4 className="font-bold mb-2">Items in Invoice #{row.original.invoiceNumber}</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead className="text-center">Quantity</TableHead>
                                  <TableHead className="text-right">Price</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {row.original.items.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">₹{item.price.toLocaleString('en-IN')}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )) : <TableRow><TableCell colSpan={salesColumns.length} className="h-24 text-center">No sales found for the selected period.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="py-4"><DataTablePagination table={table} /></div>
      </CardContent>
    </Card>
  );
}


// Reports Tab Component
const reportsColumns: ColumnDef<ReportItem>[] = [
  { accessorKey: 'name', header: 'Product Name', cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div> },
  { accessorKey: 'quantity', header: 'Quantity Sold' },
  { accessorKey: 'price', header: 'Price per Item', cell: ({ row }) => `₹${row.original.price.toLocaleString('en-IN')}` },
  { accessorKey: 'saleDate', header: 'Date Sold', cell: ({ row }) => format(new Date(row.original.saleDate), 'dd MMM yyyy') },
];

function ReportsTab({ salesData, isLoading }: { salesData: Sale[] | null, isLoading: boolean }) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const reportData = useMemo(() => {
    if (!salesData) return [];
    let items: ReportItem[] = salesData.flatMap(sale => sale.items.map(item => ({ ...item, saleDate: sale.date })));
    if (dateRange?.from) items = items.filter(item => new Date(item.saleDate) >= dateRange.from!);
    if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        items = items.filter(item => new Date(item.saleDate) <= toDate);
    }
    return items;
  }, [salesData, dateRange]);

  const table = useReactTable({
    data: reportData,
    columns: reportsColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Sales Reports</CardTitle>
            <CardDescription>A detailed report of all items sold.</CardDescription>
          </div>
          <DateRangePicker onDateChange={setDateRange} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={reportsColumns.length} className="h-24 text-center">Loading reports...</TableCell></TableRow>
                : table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>
                )) : <TableRow><TableCell colSpan={reportsColumns.length} className="h-24 text-center">No items found for the selected criteria.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="py-4"><DataTablePagination table={table} /></div>
      </CardContent>
    </Card>
  );
}


// Main Dashboard Page
export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

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

  const { data: allSalesData, isLoading: isAllSalesLoading } = useCollection<Sale>(salesCollectionRef);
  const salesData = isDemoMode ? demoSales : allSalesData;

  const todaySales = isDemoMode ? DemoData.todaySales : salesData?.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).reduce((sum, s) => sum + s.total, 0) || 0;
  const thisMonthSales = isDemoMode ? DemoData.thisMonthSales : salesData?.filter(s => new Date(s.date).getMonth() === new Date().getMonth() && new Date(s.date).getFullYear() === new Date().getFullYear()).reduce((sum, s) => sum + s.total, 0) || 0;
  const thisYearSales = isDemoMode ? DemoData.thisYearSales : salesData?.filter(s => new Date(s.date).getFullYear() === new Date().getFullYear()).reduce((sum, s) => sum + s.total, 0) || 0;

  const isLoading = isAllSalesLoading && !isDemoMode;

  return (
    <div className="flex-1 space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">
            {isDemoMode ? 'Dashboard (Demo Mode)' : 'Dashboard'}
        </h2>
        <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sales">All Sales</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        {isLoading ? <div className="text-2xl font-bold">Loading...</div> : <div className="text-2xl font-bold">₹{todaySales.toLocaleString('en-IN')}</div>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month's Sales</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        {isLoading ? <div className="text-2xl font-bold">Loading...</div> : <div className="text-2xl font-bold">₹{thisMonthSales.toLocaleString('en-IN')}</div>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Year's Sales</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        {isLoading ? <div className="text-2xl font-bold">Loading...</div> : <div className="text-2xl font-bold">₹{thisYearSales.toLocaleString('en-IN')}</div>}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="sales">
                <AllSalesTab salesData={salesData} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="reports">
                <ReportsTab salesData={salesData} isLoading={isLoading} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
