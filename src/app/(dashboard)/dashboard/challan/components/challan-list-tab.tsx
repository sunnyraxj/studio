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
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Sale } from '../../page';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs, where, Query, DocumentData, getCountFromServer, doc } from 'firebase/firestore';
import { useTranslation } from '@/hooks/use-translation';

const demoChallans: Sale[] = [
    { id: '1', invoiceNumber: 'CHLN-001', date: new Date().toISOString(), customer: { name: 'Ravi Kumar', phone: '9876543210' }, total: 2500, paymentMode: 'upi', items: [], subtotal: 2500, cgst: 0, sgst: 0, igst: 0 },
    { id: '2', invoiceNumber: 'CHLN-002', date: new Date(Date.now() - 86400000).toISOString(), customer: { name: 'Priya Sharma', phone: '9876543211' }, total: 1200, paymentMode: 'card', items: [], subtotal: 1200, cgst: 0, sgst: 0, igst: 0 },
];

export function ChallanListTab() {
  const { t } = useTranslation();

  const challanColumns: ColumnDef<Sale>[] = [
    {
      accessorKey: 'invoiceNumber',
      header: t('Challan #'),
      cell: ({ row }) => <Badge variant="outline">{row.getValue('invoiceNumber')}</Badge>,
    },
    {
      accessorKey: 'customer.name',
      header: t('Customer'),
      cell: ({ row }) => <div className="font-medium">{row.original.customer.name}</div>,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          {t('Date')} <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => format(new Date(row.getValue('date')), 'dd MMM yyyy'),
    },
    {
      accessorKey: 'total',
      header: ({ column }) => (
        <Button variant="ghost" className='w-full justify-end' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          {t('Amount')} <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-right font-semibold">₹{row.original.total.toLocaleString('en-IN')}</div>,
    },
  ];


  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !firestore || !user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  const [data, setData] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 30,
  });

  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  
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

    const challansCollectionRef = collection(firestore, `shops/${shopId}/challans`);
    let q: Query = challansCollectionRef;
    
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
        queryConstraints.push(where('customer.name', '>=', searchTerm));
        queryConstraints.push(where('customer.name', '<=', searchTerm + '\uf8ff'));
    }
    
    return query(challansCollectionRef, ...queryConstraints);
  }

  const fetchData = async () => {
    if (isDemoMode) {
      setData(demoChallans);
      setPageCount(Math.ceil(demoChallans.length / pageSize));
      return;
    }

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
      const challans: Sale[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      setData(challans);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [shopId, pageIndex, pageSize, sorting, isFilterActive, isDemoMode]);

  const handleFilter = () => {
    setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page
    setLastVisible(null);
    setIsFilterActive(prev => !prev); // Trigger re-fetch
  };
  
  const handleClearFilter = () => {
    setStartDay('');
    setStartMonth('');
    setStartYear('');
    setEndDay('');
    setEndMonth('');
    setEndYear('');
    setSearchTerm('');
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    setLastVisible(null);
    if(isFilterActive) {
      setIsFilterActive(prev => !prev);
    }
  }

  const isAnyFilterApplied = !!(searchTerm || startDay || endDay);

  const table = useReactTable({
    data,
    columns: challanColumns,
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{t('All Challans')}</CardTitle>
            <CardDescription>{t('A complete list of all your delivery challans.')}</CardDescription>
          </div>
           <div className="flex items-center gap-4">
             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t('Search by customer or challan...')}
                    className="pl-8 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-end gap-2 p-2 border rounded-lg bg-muted/50">
                <div className="grid gap-1.5">
                  <Label className="text-xs">{t('Start Date')}</Label>
                  <div className="flex gap-1">
                      <Input placeholder="DD" value={startDay} onChange={e => setStartDay(e.target.value)} className="w-12 h-8" />
                      <Input placeholder="MM" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="w-12 h-8" />
                      <Input placeholder="YYYY" value={startYear} onChange={e => setStartYear(e.target.value)} className="w-20 h-8" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">{t('End Date')}</Label>
                   <div className="flex gap-1">
                      <Input placeholder="DD" value={endDay} onChange={e => setEndDay(e.target.value)} className="w-12 h-8" />
                      <Input placeholder="MM" value={endMonth} onChange={e => setEndMonth(e.target.value)} className="w-12 h-8" />
                      <Input placeholder="YYYY" value={endYear} onChange={e => setEndYear(e.target.value)} className="w-20 h-8" />
                  </div>
                </div>
                <Button onClick={handleFilter} size="sm">{t('Filter')}</Button>
                {isAnyFilterApplied && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearFilter}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">{t('Clear Filter')}</span>
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
              {isLoading && !isDemoMode ? <TableRow><TableCell colSpan={challanColumns.length} className="h-24 text-center">{t('Loading challans...')}</TableCell></TableRow>
                : table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => (
                  <React.Fragment key={row.id}>
                    <TableRow data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  </React.Fragment>
                )) : <TableRow><TableCell colSpan={challanColumns.length} className="h-24 text-center">{t('No challans found for the selected period.')}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="py-4"><DataTablePagination table={table} /></div>
      </CardContent>
    </Card>
  );
}
