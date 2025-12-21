
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
  getExpandedRowModel,
  ExpandedState,
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
import { CaretSortIcon, ChevronDownIcon, ChevronRightIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Search, PlusCircle, IndianRupee, HandCoins } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { KhataEntry } from '../page';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, doc, addDoc, updateDoc, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast.tsx';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


type AggregatedKhata = {
    id: string;
    customerName: string;
    customerPhone: string;
    totalDue: number;
    lastEntryDate: string;
    entries: KhataEntry[];
}

let demoKhataEntries: KhataEntry[] = [
    { id: 'k1', customerName: 'Rohan Sharma', customerPhone: '9876543210', amount: 1500, notes: 'Groceries', date: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'unpaid', type: 'credit' },
    { id: 'k2', customerName: 'Priya Patel', customerPhone: '9876543211', amount: 800, notes: '2 T-shirts', date: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'unpaid', type: 'credit' },
    { id: 'k3', customerName: 'Rohan Sharma', customerPhone: '9876543210', amount: -500, notes: 'Paid back a bit', date: new Date(Date.now() - 86400000 * 1).toISOString(), status: 'paid', type: 'payment' },
    { id: 'k4', customerName: 'Amit Singh', customerPhone: '9876543212', amount: 6200, notes: 'Building materials', date: new Date(Date.now() - 86400000 * 10).toISOString(), status: 'unpaid', type: 'credit' },
    { id: 'k5', customerName: 'Sunita Devi', customerPhone: '9876543213', amount: 350, notes: 'Snacks and drinks', date: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'unpaid', type: 'credit' },
    { id: 'k6', customerName: 'Priya Patel', customerPhone: '9876543211', amount: 200, notes: 'More items', date: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'unpaid', type: 'credit' },
];


export default function KhataBookPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalDue', desc: true }]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<AggregatedKhata | null>(null);
  
  // Form state for new entry
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Form state for payment
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const [localDemoData, setLocalDemoData] = useState<KhataEntry[]>(demoKhataEntries);

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

  const aggregatedData = useMemo(() => {
    const dataToProcess = isDemoMode ? localDemoData : (khataData || []);
    if (dataToProcess.length === 0) return [];
    
    const customerMap = new Map<string, AggregatedKhata>();

    dataToProcess.forEach(entry => {
        const key = `${entry.customerName.toLowerCase()}|${entry.customerPhone || ''}`;
        if (!customerMap.has(key)) {
            customerMap.set(key, {
                id: key,
                customerName: entry.customerName,
                customerPhone: entry.customerPhone,
                totalDue: 0,
                lastEntryDate: entry.date,
                entries: []
            });
        }
        
        const customer = customerMap.get(key)!;
        customer.entries.push(entry);
        customer.totalDue += entry.amount; // Positive for credit, negative for payment
        
        if (new Date(entry.date) > new Date(customer.lastEntryDate)) {
            customer.lastEntryDate = entry.date;
        }
    });

    return Array.from(customerMap.values());
  }, [khataData, isDemoMode, localDemoData]);

  const filteredData = useMemo(() => {
     let data = aggregatedData;
     
     if (searchTerm) {
        data = data.filter(customer => 
            customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (customer.customerPhone && customer.customerPhone.includes(searchTerm))
        );
     }
     
     return data;
  }, [aggregatedData, searchTerm]);
  
  const grandTotalDue = useMemo(() => {
    return aggregatedData.reduce((sum, customer) => sum + customer.totalDue, 0);
  }, [aggregatedData]);
  
  const handleMarkAsPaid = async (entryId: string) => {
    if (isDemoMode) {
        setLocalDemoData(prevData =>
            prevData.map(entry =>
                entry.id === entryId ? { ...entry, status: 'paid' } : entry
            )
        );
        toast({ title: 'Success (Demo)', description: 'Entry marked as paid in memory.' });
        return;
    }

    if (!shopId || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Shop not found.' });
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
  
  const handleWhatsAppReminder = (customer: AggregatedKhata) => {
    if (!customer.customerPhone) {
        toast({ variant: 'destructive', title: 'No Phone Number', description: 'This customer does not have a phone number saved.' });
        return;
    }

    let message = `Hello ${customer.customerName},\n\nThis is a friendly reminder regarding your account with us.\n\n`;
    message += `*Total Amount Due: ₹${customer.totalDue.toLocaleString('en-IN')}*\n\n`;
    message += '--- Transaction Summary ---\n';

    const credits = customer.entries.filter(e => e.type === 'credit');
    const payments = customer.entries.filter(e => e.type === 'payment');

    if (credits.length > 0) {
        message += '\n*Udhar (Credit Given):*\n';
        credits.forEach(entry => {
            message += `> ${format(new Date(entry.date), 'dd MMM')}: ₹${entry.amount.toLocaleString('en-IN')} (${entry.notes})\n`;
        });
    }
    
    if (payments.length > 0) {
        message += '\n*Jama (Payment Received):*\n';
        payments.forEach(entry => {
            message += `> ${format(new Date(entry.date), 'dd MMM')}: ₹${Math.abs(entry.amount).toLocaleString('en-IN')} (${entry.notes})\n`;
        });
    }

    message += '\nPlease clear the due amount at your earliest convenience.\nThank you!';

    const whatsappUrl = `https://wa.me/${customer.customerPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
};


  const khataColumns: ColumnDef<AggregatedKhata>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={row.getToggleExpandedHandler()}
          className="h-8 w-8"
        >
          {row.getIsExpanded() ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </Button>
      ),
    },
    {
      accessorKey: 'customerName',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Customer <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div>
            <div className="font-medium">{customer.customerName}</div>
            {customer.customerPhone && <div className="text-xs text-muted-foreground">{customer.customerPhone}</div>}
          </div>
        )
      }
    },
    {
      accessorKey: 'totalDue',
      header: ({ column }) => (
        <Button variant="ghost" className="w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Total Due <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className={cn("text-right font-bold text-lg", row.original.totalDue > 0 ? 'text-destructive' : 'text-green-600' )}>₹{Math.abs(row.original.totalDue).toLocaleString('en-IN')}</div>,
    },
    {
      accessorKey: 'lastEntryDate',
       header: ({ column }) => (
        <Button variant="ghost" className="w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Last Entry <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-right">{format(new Date(row.getValue('lastEntryDate')), 'dd MMM yyyy')}</div>,
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns: khataColumns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: {
      pagination: {
        pageSize: 30,
      },
    },
  });
  
  const handleAddCreditEntry = async () => {
    if (!customerName || !amount) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Customer Name and Amount are required.' });
        return;
    }
    
    const newEntry: Omit<KhataEntry, 'id'> = {
        customerName,
        customerPhone,
        amount: parseFloat(amount),
        notes,
        date: new Date().toISOString(),
        status: 'unpaid',
        type: 'credit'
    };

    if (isDemoMode) {
        setLocalDemoData(prevData => [{...newEntry, id: `demo-${Date.now()}`}, ...prevData]);
        toast({ title: 'Success (Demo)', description: 'New credit entry added to memory.'});
    } else {
        if (!shopId || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Shop not found.' });
            return;
        }
        const khataCollectionRef = collection(firestore, `shops/${shopId}/khataEntries`);
        try {
            await addDoc(khataCollectionRef, newEntry);
            toast({ title: 'Success', description: 'New credit entry added.'});
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            return; // Don't close dialog on error
        }
    }

    setIsAddDialogOpen(false);
    setCustomerName('');
    setCustomerPhone('');
    setAmount('');
    setNotes('');
  }

  const handleAddPaymentEntry = async () => {
     if (!selectedCustomer || !paymentAmount) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Payment amount is required.' });
        return;
    }
     const newEntry: Omit<KhataEntry, 'id'> = {
        customerName: selectedCustomer.customerName,
        customerPhone: selectedCustomer.customerPhone,
        amount: -parseFloat(paymentAmount), // Payments are negative
        notes: paymentNotes || 'Payment received',
        date: new Date().toISOString(),
        status: 'paid', // Payments are always "paid"
        type: 'payment'
    };

     if (isDemoMode) {
        setLocalDemoData(prevData => [{...newEntry, id: `demo-pay-${Date.now()}`}, ...prevData]);
        toast({ title: 'Success (Demo)', description: 'Payment recorded in memory.'});
    } else {
         if (!shopId || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Shop not found.' });
            return;
        }
        const khataCollectionRef = collection(firestore, `shops/${shopId}/khataEntries`);
        try {
            await addDoc(khataCollectionRef, newEntry);
            toast({ title: 'Success', description: 'Payment recorded successfully.'});
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            return;
        }
    }

    setIsPayDialogOpen(false);
    setSelectedCustomer(null);
    setPaymentAmount('');
    setPaymentNotes('');
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Khata Book (Credit Ledger)</CardTitle>
          <CardDescription>
            Manually track all customer credit here. This is separate from POS invoices.
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-sm text-muted-foreground">Grand Total Due</p>
                <p className="text-2xl font-bold text-destructive">₹{grandTotalDue.toLocaleString('en-IN')}</p>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Udhar
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center py-4 px-2 border-y">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or phone..."
                    className="pl-8 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
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
                  <React.Fragment key={row.id}>
                  <TableRow
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
                  {row.getIsExpanded() && (
                      <TableRow>
                        <TableCell colSpan={khataColumns.length} className="p-0">
                          <div className="p-4 bg-muted/50">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold">Transaction History for {row.original.customerName}</h4>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleWhatsAppReminder(row.original)}
                                        disabled={!row.original.customerPhone}
                                    >
                                        <FaWhatsapp className="mr-2 h-4 w-4 text-green-500" />
                                        Send Reminder
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-8 w-8">
                                                <DotsHorizontalIcon className="h-4 w-4" />
                                                <span className="sr-only">More Actions</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setSelectedCustomer(row.original);
                                                    setIsPayDialogOpen(true);
                                                }}
                                                disabled={row.original.totalDue <= 0}
                                            >
                                                <HandCoins className="mr-2 h-4 w-4" />
                                                Settle Dues
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Notes</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {row.original.entries.map((entry) => (
                                  <TableRow key={entry.id}>
                                    <TableCell>{format(new Date(entry.date), 'dd MMM yyyy')}</TableCell>
                                    <TableCell>{entry.notes}</TableCell>
                                    <TableCell>
                                        <Badge variant={entry.type === 'credit' ? 'destructive' : 'default'} className="capitalize">{entry.type}</Badge>
                                    </TableCell>
                                    <TableCell className={cn("text-right font-semibold", entry.type === 'credit' ? 'text-destructive' : 'text-green-600')}>
                                        {entry.type === 'payment' && '- '}
                                        ₹{Math.abs(entry.amount).toLocaleString('en-IN')}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
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
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddCreditEntry}>
                Save Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a Payment</DialogTitle>
            <DialogDescription>
              Record a payment received from <span className="font-bold">{selectedCustomer?.customerName}</span>.
              Current due: <span className="font-bold text-destructive">₹{selectedCustomer?.totalDue.toLocaleString('en-IN')}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label htmlFor="payment-amount">Payment Amount (₹)</Label>
                <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        id="payment-amount"
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-notes">Payment Notes (Optional)</Label>
                <Textarea
                    id="payment-notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g., Paid via UPI"
                />
              </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" onClick={() => setSelectedCustomer(null)}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddPaymentEntry}>
                Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
}
