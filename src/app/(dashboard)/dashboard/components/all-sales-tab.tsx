
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
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CaretSortIcon, ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Sale } from '../page';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs, where, Query, DocumentData, getCountFromServer } from 'firebase/firestore';


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

export function AllSalesTab() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  const [data, setData] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 30,
  });

  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [startDay, setStartDay] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endDay, setEndDay] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');
  
  const buildQuery = () => {
    if (!firestore || !shopId) return null;

    const salesCollectionRef = collection(firestore, `shops/${shopId}/sales`);
    let q: Query = salesCollectionRef;
    
    const queryConstraints = [];
    
    if (sorting.length > 0) {
      queryConstraints.push(orderBy(sorting[0].id, sorting[0].desc ? 'desc' : 'asc'));
    } else {
      queryConstraints.push(orderBy('date', 'desc'));
    }

    const startDateStr = `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
    const endDateStr = `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);
    
    const isValidStartDate = !isNaN(startDate.getTime()) && startDay && startMonth && startYear;
    const isValidEndDate = !isNaN(endDate.getTime()) && endDay && endMonth && endYear;
    
    if (isValidStartDate) queryConstraints.push(where('date', '>=', startDate.toISOString()));
    if (isValidEndDate) queryConstraints.push(where('date', '<=', endDate.toISOString()));
    
    if (searchTerm) {
        // Firestore doesn't support OR queries on different fields easily.
        // We will filter by the primary search term which is customer name for now.
        queryConstraints.push(where('customer.name', '>=', searchTerm));
        queryConstraints.push(where('customer.name', '<=', searchTerm + '\uf8ff'));
    }
    
    return query(salesCollectionRef, ...queryConstraints);
  }

  const fetchData = async () => {
    if (isDemoMode) return;
    const q = buildQuery();
    if (!q) return;

    setIsLoading(true);

    try {
      const countSnapshot = await getCountFromServer(q);
      setPageCount(Math.ceil(countSnapshot.data().count / pageSize));

      let finalQuery: Query = q;
      if (pageIndex > 0 && lastVisible) {
        finalQuery = query(q, startAfter(lastVisible), limit(pageSize));
      } else {
        finalQuery = query(q, limit(pageSize));
      }

      const querySnapshot = await getDocs(finalQuery);
      const sales: Sale[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      setData(sales);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isDemoMode) {
      fetchData();
    }
  }, [pageIndex, pageSize, sorting, isFilterApplied]);

  const handleFilter = () => {
    setPageIndex(0); // Reset to first page
    setLastVisible(null);
    setIsFilterApplied(true); // Trigger re-fetch
  };
  
  const handleClearFilter = () => {
    setStartDay('');
    setStartMonth('');
    setStartYear('');
    setEndDay('');
    setEndMonth('');
    setEndYear('');
    setSearchTerm('');
    setPageIndex(0);
    setLastVisible(null);
    setIsFilterApplied(false);
  }

  const table = useReactTable({
    data,
    columns: salesColumns,
    pageCount,
    state: { sorting, expanded, pagination: { pageIndex, pageSize } },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
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
                {(isFilterApplied || searchTerm) && (
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
