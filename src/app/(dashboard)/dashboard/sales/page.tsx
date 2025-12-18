'use client';

import React, { useMemo, useState } from 'react';
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
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { CaretSortIcon } from '@radix-ui/react-icons';


type Sale = {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
  };
  date: string;
  total: number;
};

type UserProfile = {
  shopId?: string;
};

const demoSales: Sale[] = [
    { id: '1', invoiceNumber: 'INV123', date: new Date().toISOString(), customer: { name: 'Ravi Kumar' }, total: 2500 },
    { id: '2', invoiceNumber: 'INV124', date: new Date(Date.now() - 86400000).toISOString(), customer: { name: 'Priya Sharma' }, total: 1200 },
    { id: '3', invoiceNumber: 'INV125', date: new Date(Date.now() - 172800000).toISOString(), customer: { name: 'Amit Singh' }, total: 3500 },
];

const columns: ColumnDef<Sale>[] = [
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
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Date
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => format(new Date(row.getValue('date')), 'dd MMM yyyy'),
  },
  {
    accessorKey: 'total',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className='w-full justify-end'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Amount
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-right font-semibold">₹{row.original.total.toLocaleString('en-IN')}</div>,
  },
];

export default function AllSalesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const isDemoMode = !user;
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'date', desc: true }
  ]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);
  const { data: userData } = useDoc<UserProfile>(userDocRef);
  const shopId = userData?.shopId;

  const salesCollectionRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return collection(firestore, `shops/${shopId}/sales`);
  }, [firestore, shopId, isDemoMode]);

  const { data: salesData, isLoading } = useCollection<Sale>(salesCollectionRef);

  const filteredSalesData = useMemo(() => {
    let sales = isDemoMode ? demoSales : salesData;
    if (!sales) return [];

    if (dateRange?.from) {
        sales = sales.filter(sale => new Date(sale.date) >= dateRange.from!);
    }
    if (dateRange?.to) {
        sales = sales.filter(sale => new Date(sale.date) <= dateRange.to!);
    }
    
    return sales;
  }, [salesData, isDemoMode, dateRange]);

  const table = useReactTable({
    data: filteredSalesData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex-1 space-y-4">
      <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>All Sales</CardTitle>
                    <CardDescription>
                        A complete list of all your transactions.
                    </CardDescription>
                </div>
                <DateRangePicker onDateChange={setDateRange} />
            </div>
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
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      Loading sales...
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
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No sales found for the selected period.
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
    </div>
  );
}
