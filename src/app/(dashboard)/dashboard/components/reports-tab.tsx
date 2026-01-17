
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  VisibilityState,
  PaginationState,
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
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { FileDown, X, Search, IndianRupee } from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { Sale, ReportItem } from '../page';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, getDocs, limit, startAfter, getCountFromServer, Query, DocumentData, doc } from 'firebase/firestore';


const reportsColumns: ColumnDef<ReportItem>[] = [
  { accessorKey: 'name', header: 'Product Name', cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div> },
  { accessorKey: 'sku', header: 'Product Code' },
  { accessorKey: 'saleDate', header: 'Date Sold', cell: ({ row }) => format(new Date(row.original.saleDate), 'dd MMM yyyy') },
  { accessorKey: 'quantity', header: 'Quantity Sold', cell: ({ row }) => <div className='text-center'>{row.getValue('quantity')}</div> },
  { accessorKey: 'hsn', header: 'HSN Code' },
  { accessorKey: 'gst', header: 'GST (%)', cell: ({ row }) => <div className='text-center'>{`${row.original.gst || 0}%`}</div>},
  { accessorKey: 'price', header: 'Price per Item', cell: ({ row }) => <div className="text-right flex items-center justify-end gap-1"><IndianRupee className="h-3 w-3"/>{row.original.price.toLocaleString('en-IN')}</div> },
  {
    id: 'total',
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => {
      const total = row.original.price * row.original.quantity;
      return <div className="text-right font-medium flex items-center justify-end gap-1"><IndianRupee className="h-4 w-4"/>{total.toLocaleString('en-IN')}</div>;
    },
  },
];


interface ReportsTabProps {
  isDemoMode: boolean;
  demoSales: Sale[];
}

export function ReportsTab({ isDemoMode, demoSales }: ReportsTabProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  const [data, setData] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ hsn: false });
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 30 });
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDay, setStartDay] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endDay, setEndDay] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');

  const buildQuery = () => {
    if (isDemoMode) return null;
    if (!firestore || !shopId) return null;
    const baseRef = collection(firestore, `shops/${shopId}/sales`);
    let constraints = [orderBy('date', 'desc')];
    
    const startDateStr = `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
    const endDateStr = `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);
    
    if (!isNaN(startDate.getTime()) && startDay && startMonth && startYear) constraints.push(where('date', '>=', startDate.toISOString()));
    if (!isNaN(endDate.getTime()) && endDay && endMonth && endYear) constraints.push(where('date', '<=', endDate.toISOString()));
    
    return query(baseRef, ...constraints);
  }

  const fetchData = async () => {
    const salesSource = isDemoMode ? demoSales : null;
    
    if (salesSource) {
      processSalesData(salesSource);
      return;
    }
    
    const q = buildQuery();
    if (!q) {
      setData([]);
      setPageCount(0);
      return;
    };

    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(query(q)); 
      const sales = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      processSalesData(sales);
    } catch(e) {
      console.error(e)
    } finally {
      setIsLoading(false);
    }
  };

  const processSalesData = (sales: Sale[]) => {
      const netItemsMap = new Map<string, ReportItem>();

      sales.forEach(sale => {
          sale.items.forEach(item => {
              const key = item.sku || item.name;
              const existing = netItemsMap.get(key);
              if (existing) {
                  existing.quantity += item.quantity;
              } else {
                  netItemsMap.set(key, { ...item, saleDate: sale.date });
              }
          });

          if (sale.returnedItems) {
              sale.returnedItems.forEach(returnedItem => {
                  const key = returnedItem.sku || returnedItem.name;
                  const existing = netItemsMap.get(key);
                  if (existing) {
                      existing.quantity -= returnedItem.quantity;
                  }
              });
          }
      });

      let reportItems = Array.from(netItemsMap.values()).filter(item => item.quantity > 0);
      
      if (searchTerm) {
        reportItems = reportItems.filter(item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      const paginatedItems = reportItems.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
      setData(paginatedItems);
      setPageCount(Math.ceil(reportItems.length / pageSize));
  };


  useEffect(() => {
    fetchData();
  }, [shopId, pageIndex, pageSize, isFilterActive, searchTerm, isDemoMode, demoSales, startDay, startMonth, startYear, endDay, endMonth, endYear]);

  const handleFilter = () => {
    setPageIndex(0);
    setIsFilterActive(prev => !prev);
  };
  
  const handleClearFilter = () => {
    setStartDay(''); setStartMonth(''); setStartYear('');
    setEndDay(''); setEndMonth(''); setEndYear('');
    setSearchTerm('');
    setPageIndex(0);
    if (isFilterActive) {
      setIsFilterActive(prev => !prev);
    }
  }

  const isAnyFilterApplied = !!(searchTerm || startDay || endDay);

  const totalSales = useMemo(() => {
    return data.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [data]);

  const table = useReactTable({
    data,
    columns: reportsColumns,
    pageCount,
    state: {
        columnVisibility,
        pagination: { pageIndex, pageSize },
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const handleExport = () => {
    const dataToExport = data.map(item => ({
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

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-4">
                <CardTitle>Sales Reports</CardTitle>
                <div className="text-lg font-medium text-muted-foreground flex items-center gap-1">
                    Total Sales (Filtered): <span className="font-bold text-foreground flex items-center gap-1"><IndianRupee className="h-4 w-4"/>{totalSales.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <CardDescription>A detailed report of all items sold.</CardDescription>
            </div>
             <div className="flex items-center gap-2">
               <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Search by product name or code..."
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
                {isAnyFilterApplied && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearFilter}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear Filter</span>
                  </Button>
                )}
            </div>
              <Separator orientation="vertical" className="h-10" />
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="outline" onClick={handleExport} disabled={data.length === 0}>
                          <FileDown className="mr-2 h-4 w-4" /> Export
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>Downloads an Excel file of the currently filtered sales report.</p>
                  </TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Cols <ChevronDownIcon className="ml-2 h-4 w-4" />
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
              <TableBody>
                {isLoading && !isDemoMode ? <TableRow><TableCell colSpan={reportsColumns.length} className="h-24 text-center">Loading reports...</TableCell></TableRow>
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
