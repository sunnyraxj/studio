
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
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { Search } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import type { Sale, Customer } from '../page';
import { Badge } from '@/components/ui/badge';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, query, getDocs, orderBy, limit, startAfter, where, Query, DocumentData, getCountFromServer } from 'firebase/firestore';


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
      return <div className="flex flex-wrap gap-1">{invoices.map(inv => <Badge key={inv} variant="outline">{inv}</Badge>)}</div>;
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

interface CustomersTabProps {
  isDemoMode: boolean;
  demoSales: Sale[];
}

export function CustomersTab({ isDemoMode, demoSales }: CustomersTabProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'lastPurchaseDate', desc: true }]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;
  
  const [data, setData] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 30,
  });

  const fetchData = async () => {
    if (isDemoMode) {
      let salesData = demoSales;
      const customerMap = new Map<string, any>();

        salesData.forEach((sale) => {
          if (!sale.customer || (!sale.customer.phone && !sale.customer.name)) return;
          const customerKey = sale.customer.phone || sale.customer.name.toLowerCase();

          if (customerMap.has(customerKey)) {
            const existing = customerMap.get(customerKey);
            existing.invoiceNumbers.add(sale.invoiceNumber);
            if (new Date(sale.date) > new Date(existing.lastPurchaseDate)) {
                existing.lastPurchaseDate = sale.date;
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
        
        let allCustomers = Array.from(customerMap.values()).map(c => ({
            ...c,
            invoiceNumbers: Array.from(c.invoiceNumbers),
        }));

        if (searchTerm) {
            allCustomers = allCustomers.filter(customer => 
                customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (customer.phone && customer.phone.includes(searchTerm))
            );
        }
        allCustomers.sort((a, b) => new Date(b.lastPurchaseDate).getTime() - new Date(a.lastPurchaseDate).getTime());
        
        setPageCount(Math.ceil(allCustomers.length / pageSize));
        setData(allCustomers.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize));

      return;
    }
    if (!shopId || !firestore) return;

    setIsLoading(true);
    
    try {
        const salesCollectionRef = collection(firestore, `shops/${shopId}/sales`);
        const querySnapshot = await getDocs(query(salesCollectionRef, orderBy('date', 'desc')));
        const salesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
        
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
        
        let allCustomers = Array.from(customerMap.values()).map(c => ({
            ...c,
            invoiceNumbers: Array.from(c.invoiceNumbers),
        }));

        if (searchTerm) {
            allCustomers = allCustomers.filter(customer => 
                customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (customer.phone && customer.phone.includes(searchTerm))
            );
        }

        allCustomers.sort((a, b) => {
            if (sorting[0]?.id === 'lastPurchaseDate') {
                const dateA = new Date(a.lastPurchaseDate).getTime();
                const dateB = new Date(b.lastPurchaseDate).getTime();
                return sorting[0].desc ? dateB - dateA : dateA - dateB;
            }
            return 0;
        });

        setPageCount(Math.ceil(allCustomers.length / pageSize));
        const paginatedData = allCustomers.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
        setData(paginatedData);

    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pageIndex, pageSize, shopId, firestore, isDemoMode, searchTerm, sorting, demoSales]);
  

  const table = useReactTable({
    data,
    columns: customerColumns,
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
