
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
import { format, isAfter, subHours, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { IndianRupee, Pencil } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, where, doc } from 'firebase/firestore';
import type { Sale } from '../../page';
import { Badge } from '@/components/ui/badge';


interface TodaysSalesTabProps {
    setPosTab: (tab: string) => void;
}


export function TodaysSalesTab({ setPosTab }: TodaysSalesTabProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !firestore || !user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;
  
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);

  const salesQuery = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    return query(
        collection(firestore, `shops/${shopId}/sales`),
        where('date', '>=', todayStart),
        where('date', '<=', todayEnd),
        orderBy('date', 'desc')
    );
  }, [shopId, firestore, isDemoMode]);
  
  const { data: salesData, isLoading } = useCollection<Sale>(salesQuery);
  const demoSales: Sale[] = [];

  const handleEdit = (saleId: string) => {
    // Here you would navigate to an edit page or open a modal
    // For now, we just log it and potentially switch tab
    console.log(`Editing sale ${saleId}`);
    // Example: To go back to new sale tab to edit
    // setPosTab('new-sale'); 
  };
  
  const salesColumns: ColumnDef<Sale>[] = [
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice #',
      cell: ({ row }) => <Badge variant="outline">{row.getValue('invoiceNumber')}</Badge>,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Time <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => format(new Date(row.getValue('date')), 'hh:mm a'),
    },
    {
      accessorKey: 'customer.name',
      header: 'Customer',
      cell: ({ row }) => <div className="font-medium">{row.original.customer.name}</div>,
    },
    {
      accessorKey: 'total',
      header: ({ column }) => (
        <Button variant="ghost" className='w-full justify-end' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Amount <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-right font-semibold flex items-center justify-end gap-1"><IndianRupee className="h-4 w-4" />{row.original.total.toLocaleString('en-IN')}</div>,
    },
    {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const saleDate = new Date(row.original.date);
          const twelveHoursAgo = subHours(new Date(), 12);
          const isEditable = isAfter(saleDate, twelveHoursAgo);

          return (
            <div className="text-right">
                <Button variant="outline" size="sm" onClick={() => handleEdit(row.original.id)} disabled={!isEditable}>
                    <Pencil className="h-4 w-4 mr-2"/> Edit
                </Button>
            </div>
          );
        },
    },
  ];

  const tableData = isDemoMode ? demoSales : (salesData || []);

  const table = useReactTable({
    data: tableData,
    columns: salesColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
     initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Today's Sales</CardTitle>
        <CardDescription>A list of all sales recorded today. You can edit an invoice up to 12 hours after it was created.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="rounded-md border">
          <Table>
            <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={salesColumns.length} className="h-24 text-center">Loading today's sales...</TableCell></TableRow>
                : table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )) : <TableRow><TableCell colSpan={salesColumns.length} className="h-24 text-center">No sales recorded yet today.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
       <CardFooter className="justify-end">
         <DataTablePagination table={table} />
       </CardFooter>
    </Card>
  );
}
