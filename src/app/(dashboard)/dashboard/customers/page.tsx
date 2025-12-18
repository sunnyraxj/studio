
'use client';

import React, { useMemo } from 'react';
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
import { FaWhatsapp } from 'react-icons/fa';
import { DataTablePagination } from '@/components/data-table-pagination';

type Sale = {
  id: string;
  customer: {
    name: string;
    phone: string;
  };
  invoiceNumber: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  invoiceNumbers: string[];
};

type UserProfile = {
  shopId?: string;
};

const demoCustomers: Customer[] = [
    { id: '1', name: 'Ravi Kumar', phone: '9876543210', invoiceNumbers: ['INV123', 'INV128'] },
    { id: '2', name: 'Priya Sharma', phone: '9876543211', invoiceNumbers: ['INV124'] },
    { id: '3', name: 'Amit Singh', phone: '9876543212', invoiceNumbers: ['INV125', 'INV129', 'INV130'] },
    { id: '4', name: 'Sunita Gupta', phone: '9876543213', invoiceNumbers: ['INV126'] },
    { id: '5', name: 'Vikas Patel', phone: '9876543214', invoiceNumbers: ['INV127'] },
];

const columns: ColumnDef<Customer>[] = [
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

export default function CustomersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const isDemoMode = !user;

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

  const customersData = useMemo(() => {
    if (isDemoMode) return demoCustomers;
    if (!salesData) return [];

    const customerMap = new Map<string, Customer>();

    salesData.forEach((sale) => {
      // Normalize phone number to use as a key, or name if phone is not available.
      const customerKey = sale.customer.phone || sale.customer.name.toLowerCase();
      if (!customerKey) return; // Skip if no key can be determined

      if (customerMap.has(customerKey)) {
        const existingCustomer = customerMap.get(customerKey)!;
        existingCustomer.invoiceNumbers.push(sale.invoiceNumber);
      } else {
        customerMap.set(customerKey, {
          id: customerKey,
          name: sale.customer.name,
          phone: sale.customer.phone,
          invoiceNumbers: [sale.invoiceNumber],
        });
      }
    });

    return Array.from(customerMap.values());
  }, [salesData, isDemoMode]);

  const table = useReactTable({
    data: customersData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex-1 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            A list of all your customers and their purchase history.
          </CardDescription>
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
                      colSpan={columns.length}
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
    </div>
  );
}
