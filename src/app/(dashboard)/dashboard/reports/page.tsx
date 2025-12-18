'use client';

import React, { useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

type Sale = {
  id: string;
  date: string;
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

const demoSales: Sale[] = [
    { id: '1', date: new Date().toISOString(), items: [{ productId: '1', name: 'T-Shirt', quantity: 2, price: 500 }, { productId: '2', name: 'Jeans', quantity: 1, price: 1500 }] },
    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), items: [{ productId: '3', name: 'Sneakers', quantity: 1, price: 1200 }] },
    { id: '3', date: new Date(Date.now() - 172800000).toISOString(), items: [{ productId: '4', name: 'Watch', quantity: 1, price: 3500 }] },
];


const columns: ColumnDef<ReportItem>[] = [
  {
    accessorKey: 'name',
    header: 'Product Name',
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity Sold',
  },
  {
    accessorKey: 'price',
    header: 'Price per Item',
    cell: ({ row }) => `₹${row.original.price.toLocaleString('en-IN')}`,
  },
  {
    accessorKey: 'saleDate',
    header: 'Date Sold',
    cell: ({ row }) => format(new Date(row.original.saleDate), 'dd MMM yyyy'),
  },
];

export default function ReportsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const isDemoMode = !user;
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

  const reportData = useMemo(() => {
    const sourceData = isDemoMode ? demoSales : salesData;
    if (!sourceData) return [];

    let items: ReportItem[] = sourceData.flatMap(sale =>
      sale.items.map(item => ({
        ...item,
        saleDate: sale.date,
      }))
    );
    
    if (dateRange?.from) {
        items = items.filter(item => new Date(item.saleDate) >= dateRange.from!);
    }
    if (dateRange?.to) {
        items = items.filter(item => new Date(item.saleDate) <= dateRange.to!);
    }

    return items;
  }, [salesData, isDemoMode, dateRange]);

  const table = useReactTable({
    data: reportData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex-1 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle>Sales Reports</CardTitle>
                <CardDescription>
                    A detailed report of all items sold.
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
                      Loading reports...
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
                      No items found for the selected criteria.
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
