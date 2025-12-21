
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
import { DataTablePagination } from '@/components/data-table-pagination';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Sale } from '../page';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const khataColumns: ColumnDef<Sale>[] = [
  {
    accessorKey: 'invoiceNumber',
    header: 'Invoice #',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('invoiceNumber')}</Badge>,
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
    accessorKey: 'customer.name',
    header: 'Customer',
    cell: ({ row }) => <div className="font-medium">{row.original.customer.name}</div>,
  },
    {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return <Badge variant={status === 'unpaid' ? 'destructive' : 'secondary'} className="capitalize">{status}</Badge>
    }
  },
  {
    accessorKey: 'total',
    header: () => <div className="text-right">Total Amount</div>,
    cell: ({ row }) => <div className="text-right font-semibold">₹{row.original.total.toLocaleString('en-IN')}</div>,
  },
    {
    accessorKey: 'amountPaid',
    header: () => <div className="text-right">Amount Paid</div>,
    cell: ({ row }) => <div className="text-right font-medium text-green-600">₹{row.original.amountPaid.toLocaleString('en-IN')}</div>,
  },
  {
    accessorKey: 'amountDue',
    header: ({ column }) => (
      <Button variant="ghost" className="w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Amount Due <CaretSortIcon className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right font-bold text-destructive">₹{row.original.amountDue.toLocaleString('en-IN')}</div>,
  },
];

export default function KhataBookPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'amountDue', desc: true }]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  const creditSalesQuery = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    const salesCollectionRef = collection(firestore, `shops/${shopId}/sales`);
    return query(salesCollectionRef, where('status', 'in', ['partial', 'unpaid']));
  }, [shopId, firestore, isDemoMode]);
  
  const { data: creditSalesData, isLoading } = useCollection<Sale>(creditSalesQuery);

  const filteredData = useMemo(() => {
     if (!creditSalesData) return [];
     if (!searchTerm) return creditSalesData;
     return creditSalesData.filter(sale => 
         sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
     );
  }, [creditSalesData, searchTerm]);
  
  const totalDue = useMemo(() => {
    return (filteredData || []).reduce((sum, sale) => sum + sale.amountDue, 0);
  }, [filteredData]);

  const table = useReactTable({
    data: filteredData,
    columns: khataColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 30,
      },
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Khata Book (Credit Ledger)</CardTitle>
          <CardDescription>
            Track all unpaid and partially paid invoices.
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount Due</p>
                <p className="text-2xl font-bold text-destructive">₹{totalDue.toLocaleString('en-IN')}</p>
            </div>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by customer or invoice..."
                    className="pl-8 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
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
                    colSpan={khataColumns.length}
                    className="h-24 text-center"
                  >
                    Loading credit sales...
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
                    colSpan={khataColumns.length}
                    className="h-24 text-center"
                  >
                    No outstanding payments found.
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
