
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
import { FaWhatsapp } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import type { Sale, Customer } from '../page';
import { demoCustomers } from '../page';


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

export function CustomersTab({ salesData, isLoading, isDemoMode }: { salesData: Sale[] | null, isLoading: boolean, isDemoMode: boolean }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'lastPurchaseDate', desc: true }]);
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  const filteredCustomers = useMemo(() => {
     if (!searchTerm) return customersData;
     return customersData.filter(customer => 
         customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (customer.phone && customer.phone.includes(searchTerm))
     );
  }, [customersData, searchTerm]);

  const table = useReactTable({
    data: filteredCustomers,
    columns: customerColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            A list of all your customers and their purchase history.
          </CardDescription>
        </div>
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search by name or phone..."
                className="pl-8 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
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
