
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
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
import { DataTablePagination } from '@/components/data-table-pagination';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { FileDown, X, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { Sale, ReportItem } from '../page';


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


export function ReportsTab({ salesData, isLoading }: { salesData: Sale[] | null, isLoading: boolean }) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    hsn: false,
  });
  
  const [filteredData, setFilteredData] = useState<ReportItem[]>([]);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [startDay, setStartDay] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endDay, setEndDay] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');

  const reportData = useMemo(() => {
    if (!salesData) return [];
    return salesData.flatMap(sale => sale.items.map(item => ({ ...item, saleDate: sale.date })));
  }, [salesData]);
  
  useEffect(() => {
    let data = reportData;

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
            data = data.filter(item => new Date(item.saleDate) >= startDate);
            applied = true;
        }
        if (isValidEndDate) {
            data = data.filter(item => new Date(item.saleDate) <= endDate);
            applied = true;
        }
    }

    // Search filtering
    if (searchTerm) {
        data = data.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        applied = true;
    }
    
    setFilteredData(data);
    setIsFilterApplied(applied || !!searchTerm || (isFilterApplied && (isValidStartDate || isValidEndDate)));

  }, [reportData, startDay, startMonth, startYear, endDay, endMonth, endYear, searchTerm, isFilterApplied]);

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

  const totalSales = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [filteredData]);

  const table = useReactTable({
    data: filteredData,
    columns: reportsColumns,
    state: {
        columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleExport = () => {
    const dataToExport = filteredData.map(item => ({
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
              <CardTitle>Sales Reports</CardTitle>
              <CardDescription>A detailed report of all items sold.</CardDescription>
              <div className="mt-4 text-lg font-medium">
                Total Sales (Filtered): <span className="font-bold">₹{totalSales.toLocaleString('en-IN')}</span>
              </div>
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
                {isFilterApplied && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearFilter}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear Filter</span>
                  </Button>
                )}
            </div>
              <Separator orientation="vertical" className="h-10" />
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="outline" onClick={handleExport} disabled={filteredData.length === 0}>
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
