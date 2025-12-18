
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
  VisibilityState,
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
import { IndianRupee, FileDown, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FaWhatsapp } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


// Common Types
type Sale = {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    phone?: string;
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
  sku?: string;
  hsn?: string;
  gst?: number;
};

type ReportItem = SaleItem & {
  saleDate: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  invoiceNumbers: string[];
  lastPurchaseDate: string;
};

type UserProfile = {
  shopId?: string;
};

// Demo Data
const demoSales: Sale[] = [
    { id: '1', invoiceNumber: 'INV123', date: new Date().toISOString(), customer: { name: 'Ravi Kumar', phone: '9876543210' }, total: 2500, items: [{ productId: '1', name: 'T-Shirt', quantity: 2, price: 500, sku: 'TS-01', hsn: '6109', gst: 5 }, { productId: '2', name: 'Jeans', quantity: 1, price: 1500, sku: 'JN-01', hsn: '6203', gst: 5 }] },
    { id: '2', invoiceNumber: 'INV124', date: new Date(Date.now() - 86400000).toISOString(), customer: { name: 'Priya Sharma', phone: '9876543211' }, total: 1200, items: [{ productId: '3', name: 'Sneakers', quantity: 1, price: 1200, sku: 'SH-01', hsn: '6404', gst: 18 }] },
    { id: '3', invoiceNumber: 'INV125', date: new Date(Date.now() - 172800000).toISOString(), customer: { name: 'Amit Singh', phone: '9876543212' }, total: 3500, items: [{ productId: '4', name: 'Watch', quantity: 1, price: 3500, sku: 'WT-01', hsn: '9102', gst: 18 }] },
];
const demoCustomers: Customer[] = [
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
  { accessorKey: 'sku', header: 'Product Code' },
  { accessorKey: 'saleDate', header: 'Date Sold', cell: ({ row }) => format(new Date(row.original.saleDate), 'dd MMM yyyy') },
  { accessorKey: 'quantity', header: 'Quantity Sold', cell: ({ row }) => <div className='text-center'>{row.getValue('quantity')}</div> },
  { accessorKey: 'hsn', header: 'HSN Code' },
  { accessorKey: 'gst', header: 'GST (%)', cell: ({ row }) => <div className='text-center'>{`${row.original.gst || 0}%`}</div>},
  { accessorKey: 'price', header: 'Price per Item', cell: ({ row }) => <div className="text-right">₹{row.original.price.toLocaleString('en-IN')}</div> },
  {
    id: 'total',
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => {
      const total = row.original.price * row.original.quantity;
      return <div className="text-right font-medium">₹{total.toLocaleString('en-IN')}</div>;
    },
  },
];


function ReportsTab({ salesData, isLoading }: { salesData: Sale[] | null, isLoading: boolean }) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    hsn: false,
  });

  const reportData = useMemo(() => {
    if (!salesData) return [];
    let items: ReportItem[] = salesData.flatMap(sale => sale.items.map(item => ({ ...item, saleDate: sale.date })));
    if (dateRange?.from) {
        items = items.filter(item => new Date(item.saleDate) >= dateRange.from!);
    }
    if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        items = items.filter(item => new Date(item.saleDate) <= toDate);
    }
    return items;
  }, [salesData, dateRange]);

  const totalSales = useMemo(() => {
    return reportData.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [reportData]);

  const table = useReactTable({
    data: reportData,
    columns: reportsColumns,
    state: {
        columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleExport = () => {
    const dataToExport = reportData.map(item => ({
        'Product Name': item.name,
        'Product Code': item.sku,
        'Date Sold': format(new Date(item.saleDate), 'dd-MM-yyyy'),
        'Quantity Sold': item.quantity,
        'HSN Code': item.hsn,
        'GST (%)': item.gst,
        'Price per Item': item.price,
        'Total': item.price * item.quantity
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
    XLSX.writeFile(workbook, `SalesReport-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  const handleClearFilter = () => {
    setDateRange(undefined);
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Sales Reports</CardTitle>
              <CardDescription>A detailed report of all items sold.</CardDescription>
              <div className="mt-4 text-lg">
                <span className="font-bold">Total Sales (Filtered):</span> ₹{totalSales.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="outline" onClick={handleExport} disabled={reportData.length === 0}>
                          <FileDown className="mr-2 h-4 w-4" /> Export to Excel
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>Downloads an Excel file of the currently filtered sales report.</p>
                  </TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Columns <ChevronDownIcon className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {column.id === 'saleDate' ? 'Date Sold' : 
                          column.id === 'name' ? 'Product Name' :
                          column.id === 'sku' ? 'Product Code' :
                          column.id === 'hsn' ? 'HSN Code' :
                          column.id }
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
              <DateRangePicker onDateChange={setDateRange} initialDateRange={dateRange} />
              {dateRange && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleClearFilter}>
                            <X className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Clear date filter</p>
                    </TooltipContent>
                </Tooltip>
              )}
            </div>
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
    </TooltipProvider>
  );
}


// Customers Tab Component
const customerColumns: ColumnDef<Customer>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'lastPurchaseDate',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Last Purchase
        <CaretSortIcon className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => format(new Date(row.getValue('lastPurchaseDate')), 'dd MMM yyyy'),
  },
  {
    accessorKey: 'invoiceNumbers',
    header: 'Invoice Numbers',
    cell: ({ row }) => {
      const invoices = row.getValue('invoiceNumbers') as string[];
      return <div className="flex flex-wrap gap-1">{invoices.map(inv => <span key={inv} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">{inv}</span>)}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const customer = row.original;
      const handleWhatsApp = () => {
        if (customer.phone) {
          window.open(`https://wa.me/${customer.phone}`, '_blank');
        }
      };

      return (
        <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={!customer.phone}>
          <FaWhatsapp className="mr-2 h-4 w-4" />
          WhatsApp
        </Button>
      );
    },
  },
];

function CustomersTab({ salesData, isLoading, isDemoMode }: { salesData: Sale[] | null, isLoading: boolean, isDemoMode: boolean }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'lastPurchaseDate', desc: true }]);

  const customersData = useMemo(() => {
    if (isDemoMode) return demoCustomers;
    if (!salesData) return [];

    type CustomerAggregate = {
        id: string;
        name: string;
        phone: string;
        invoiceNumbers: Set<string>;
        lastPurchaseDate: string;
    }

    const customerMap = new Map<string, CustomerAggregate>();

    salesData.forEach((sale) => {
      if (!sale.customer || (!sale.customer.phone && !sale.customer.name)) return;
      
      const customerKey = sale.customer.phone || sale.customer.name.toLowerCase();

      if (customerMap.has(customerKey)) {
        const existingCustomer = customerMap.get(customerKey)!;
        existingCustomer.invoiceNumbers.add(sale.invoiceNumber);
        if (new Date(sale.date) > new Date(existingCustomer.lastPurchaseDate)) {
            existingCustomer.lastPurchaseDate = sale.date;
        }
      } else {
        customerMap.set(customerKey, {
          id: customerKey,
          name: sale.customer.name,
          phone: sale.customer.phone || '',
          invoiceNumbers: new Set([sale.invoiceNumber]),
          lastPurchaseDate: sale.date,
        });
      }
    });
    
    return Array.from(customerMap.values()).map(c => ({
        ...c,
        invoiceNumbers: Array.from(c.invoiceNumbers),
    }));

  }, [salesData, isDemoMode]);

  const table = useReactTable({
    data: customersData,
    columns: customerColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customers</CardTitle>
        <CardDescription>
          A list of all your customers and their purchase history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading && !isDemoMode ? (
                <TableRow>
                  <TableCell
                    colSpan={customerColumns.length}
                    className="h-24 text-center"
                  >
                    Loading customers...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={customerColumns.length}
                    className="h-24 text-center"
                  >
                    No customers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="py-4">
          <DataTablePagination table={table} />
        </div>
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
                <TabsTrigger value="customers">Customers</TabsTrigger>
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
            <TabsContent value="customers">
                <CustomersTab salesData={salesData} isLoading={isLoading} isDemoMode={isDemoMode} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
