
'use client';

import React, { useMemo, useState, useEffect } from 'react';
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
import { DataTablePagination } from '@/components/data-table-pagination';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CaretSortIcon, ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Sale } from '../page';


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

export function AllSalesTab({ salesData, isLoading }: { salesData: Sale[] | null, isLoading: boolean }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  
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
            sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
        );
        applied = true;
    }

    setFilteredData(data);
    setIsFilterApplied(applied || !!searchTerm || (isFilterApplied && (isValidStartDate || isValidEndDate)));

  },[originalData, startDay, startMonth, startYear, endDay, endMonth, endYear, searchTerm, isFilterApplied]);

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
    columns: salesColumns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getRowCanExpand: () => true,
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
           <div className="flex items-center gap-4">
             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by customer or invoice..."
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
