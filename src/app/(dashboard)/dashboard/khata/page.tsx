
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
import { Search, PlusCircle, IndianRupee } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { KhataEntry } from '../page';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, doc, addDoc, updateDoc, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast.tsx';


export default function KhataBookPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Form state for new entry
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  const khataQuery = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    const khataCollectionRef = collection(firestore, `shops/${shopId}/khataEntries`);
    return query(khataCollectionRef, orderBy('date', 'desc'));
  }, [shopId, firestore, isDemoMode]);
  
  const { data: khataData, isLoading } = useCollection<KhataEntry>(khataQuery);

  const filteredData = useMemo(() => {
     if (!khataData) return [];
     if (!searchTerm) return khataData;
     return khataData.filter(entry => 
         entry.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (entry.customerPhone && entry.customerPhone.includes(searchTerm))
     );
  }, [khataData, searchTerm]);
  
  const totalDue = useMemo(() => {
    return (filteredData || []).filter(e => e.status === 'unpaid').reduce((sum, entry) => sum + entry.amount, 0);
  }, [filteredData]);
  
  const handleMarkAsPaid = async (entryId: string) => {
    if (isDemoMode || !shopId || !firestore) {
        toast({ variant: 'destructive', title: 'Action not allowed in demo mode.'});
        return;
    }
    const entryDocRef = doc(firestore, `shops/${shopId}/khataEntries`, entryId);
    try {
        await updateDoc(entryDocRef, { status: 'paid' });
        toast({ title: 'Success', description: 'Entry marked as paid.'});
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  }

  const khataColumns: ColumnDef<KhataEntry>[] = [
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
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <div>
            <div className="font-medium">{entry.customerName}</div>
            {entry.customerPhone && <div className="text-xs text-muted-foreground">{entry.customerPhone}</div>}
          </div>
        )
      }
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => <div className="text-right font-semibold">₹{row.original.amount.toLocaleString('en-IN')}</div>,
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
          const status = row.getValue('status') as string;
          return <Badge variant={status === 'unpaid' ? 'destructive' : 'default'} className="capitalize">{status}</Badge>
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const entry = row.original;
        if (entry.status === 'unpaid') {
          return (
            <Button size="sm" onClick={() => handleMarkAsPaid(entry.id)}>Mark as Paid</Button>
          );
        }
        return null;
      },
    },
  ];

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
  
  const handleAddNewEntry = async () => {
    if (isDemoMode || !shopId || !firestore) {
        toast({ variant: 'destructive', title: 'Action not allowed in demo mode.'});
        return;
    }
    
    if (!customerName || !amount) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Customer Name and Amount are required.' });
        return;
    }

    const khataCollectionRef = collection(firestore, `shops/${shopId}/khataEntries`);
    try {
        await addDoc(khataCollectionRef, {
            customerName,
            customerPhone,
            amount: parseFloat(amount),
            notes,
            date: new Date().toISOString(),
            status: 'unpaid'
        });

        toast({ title: 'Success', description: 'New credit entry added.'});
        setIsAddDialogOpen(false);
        // Clear form
        setCustomerName('');
        setCustomerPhone('');
        setAmount('');
        setNotes('');
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Khata Book (Credit Ledger)</CardTitle>
          <CardDescription>
            Manually track all customer credit here. This is separate from POS invoices.
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
                    placeholder="Search by name or phone..."
                    className="pl-8 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Udhar
            </Button>
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
                    Loading Khata...
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
                    No credit entries found.
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

       <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Credit (Udhar)</DialogTitle>
            <DialogDescription>
              Enter the details for the new credit entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <Label htmlFor="customer-name">Customer Name</Label>
                  <Input 
                    id="customer-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Raju Kumar"
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="customer-phone">Phone Number (Optional)</Label>
                  <Input 
                    id="customer-phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                  />
                </div>
             </div>
             <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., For 2 T-shirts"
                />
              </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" onClick={() => {}}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddNewEntry}>
                Save Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
}
