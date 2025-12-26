
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
import { CaretSortIcon, ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { Search, PlusCircle, IndianRupee, HandCoins, Bank, Hash, Phone, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, doc, addDoc, updateDoc, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast.tsx';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';

type Employee = {
    id: string;
    name: string;
    phone: string;
    address: string;
    role: string;
    joiningDate: string;
    monthlySalary: number;
    bankDetails?: {
        bankName?: string;
        accountNumber?: string;
        ifscCode?: string;
    };
    salaryPayments?: SalaryPayment[];
};

type SalaryPayment = {
    id: string;
    paymentDate: string;
    amount: number;
    notes: string;
}

export default function EmployeesPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isPaySalaryOpen, setIsPaySalaryOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form state for new employee
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState('');
  const [joiningDate, setJoiningDate] = useState<Date>();
  const [monthlySalary, setMonthlySalary] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Form state for salary payment
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>();

  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;
  
  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  const employeesQuery = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    const employeesCollectionRef = collection(firestore, `shops/${shopId}/employees`);
    return query(employeesCollectionRef, orderBy('name', 'asc'));
  }, [shopId, firestore, isDemoMode]);
  
  const { data: employeesData, isLoading } = useCollection<Employee>(employeesQuery);

  const filteredData = useMemo(() => {
     let data = employeesData || [];
     if (searchTerm) {
        data = data.filter(employee => 
            employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (employee.phone && employee.phone.includes(searchTerm)) ||
            (employee.role && employee.role.toLowerCase().includes(searchTerm.toLowerCase()))
        );
     }
     return data;
  }, [employeesData, searchTerm]);
  
  const columns: ColumnDef<Employee>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={row.getToggleExpandedHandler()} className="h-8 w-8">
          {row.getIsExpanded() ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </Button>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => <div>{row.original.role}</div>
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => <div>{row.original.phone}</div>
    },
    {
      accessorKey: 'monthlySalary',
      header: ({ column }) => (
        <Button variant="ghost" className="w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Salary <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-right font-semibold">₹{row.original.monthlySalary.toLocaleString('en-IN')}</div>
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        return (
          <div className="text-right">
            <Button size="sm" onClick={() => {
                setSelectedEmployee(row.original);
                setPaymentDate(new Date()); // Default to today
                setIsPaySalaryOpen(true);
            }}>
                <HandCoins className="mr-2 h-4 w-4" /> Pay Salary
            </Button>
          </div>
        );
      },
    }
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const clearAddEmployeeForm = () => {
    setName('');
    setPhone('');
    setAddress('');
    setRole('');
    setJoiningDate(undefined);
    setMonthlySalary('');
    setBankName('');
    setAccountNumber('');
    setIfscCode('');
  }

  const handleAddEmployee = async () => {
    if (!name || !monthlySalary || !joiningDate) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Name, Joining Date and Monthly Salary are required.' });
        return;
    }
    const newEmployee = {
        name,
        phone,
        address,
        role,
        joiningDate: joiningDate.toISOString(),
        monthlySalary: parseFloat(monthlySalary),
        bankDetails: { bankName, accountNumber, ifscCode }
    }
    
    if (isDemoMode) {
        toast({ title: 'Success (Demo)', description: `${name} has been added.`});
    } else {
         if (!shopId || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Shop not found.' });
            return;
        }
        const employeesCollection = collection(firestore, `shops/${shopId}/employees`);
        try {
            await addDoc(employeesCollection, newEmployee);
            toast({ title: 'Success', description: `${name} has been added to your staff.`});
        } catch(e: any) {
             toast({ variant: 'destructive', title: 'Error', description: e.message });
             return;
        }
    }
    setIsAddEmployeeOpen(false);
    clearAddEmployeeForm();
  }
  
  const handlePaySalary = async () => {
    if (!selectedEmployee || !paymentAmount || !paymentDate) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Payment amount and date are required.' });
      return;
    }
    
    const newPayment = {
      paymentDate: paymentDate.toISOString(),
      amount: parseFloat(paymentAmount),
      notes: paymentNotes
    };

    if (isDemoMode) {
      toast({ title: 'Success (Demo)', description: `Paid ₹${paymentAmount} to ${selectedEmployee.name}.` });
    } else {
      if (!shopId || !firestore) return;
      const paymentsCollection = collection(firestore, `shops/${shopId}/employees/${selectedEmployee.id}/salaryPayments`);
      try {
        await addDoc(paymentsCollection, newPayment);
        toast({ title: 'Success', description: `Salary paid to ${selectedEmployee.name}.` });
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
        return;
      }
    }
    
    setIsPaySalaryOpen(false);
    setSelectedEmployee(null);
    setPaymentAmount('');
    setPaymentNotes('');
    setPaymentDate(undefined);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Employee Management</CardTitle>
          <CardDescription>
            Add, view, and manage your staff and their salaries.
          </CardDescription>
        </div>
        <Button onClick={() => { clearAddEmployeeForm(); setIsAddEmployeeOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center py-4 px-2 border-y">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name, role, or phone..."
                    className="pl-8 w-80"
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
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading && !isDemoMode ? (
                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading Employees...</TableCell></TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow data-state={row.getIsExpanded() ? 'selected' : ''}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                    {row.getIsExpanded() && (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="p-0">
                          <div className="p-4 bg-muted/50 space-y-4">
                            <h4 className="font-bold">Details for {row.original.name}</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p><strong>Joining Date:</strong> {format(new Date(row.original.joiningDate), 'dd MMM, yyyy')}</p>
                                    <p><strong>Address:</strong> {row.original.address || 'N/A'}</p>
                                </div>
                                 <div className="space-y-1">
                                    <p><strong>Bank:</strong> {row.original.bankDetails?.bankName || 'N/A'}</p>
                                    <p><strong>A/C No:</strong> {row.original.bankDetails?.accountNumber || 'N/A'}</p>
                                    <p><strong>IFSC:</strong> {row.original.bankDetails?.ifscCode || 'N/A'}</p>
                                </div>
                            </div>
                            <SalaryPaymentHistory employee={row.original} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No employees found. Add your first one!</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="py-4"><DataTablePagination table={table} /></div>
      </CardContent>

      <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
            <ScrollArea className="max-h-[70vh] p-4">
              <div className="grid gap-4 py-4 pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="name">Name*</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                </div>
                 <div className="space-y-2"><Label htmlFor="address">Address</Label><Textarea id="address" value={address} onChange={e => setAddress(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="role">Role / Designation</Label><Input id="role" value={role} onChange={e => setRole(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="joiningDate">Joining Date*</Label>
                        <Popover><PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !joiningDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />{joiningDate ? format(joiningDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={joiningDate} onSelect={setJoiningDate} initialFocus /></PopoverContent></Popover>
                    </div>
                </div>
                <div className="space-y-2"><Label htmlFor="salary">Monthly Salary (₹)*</Label><Input id="salary" type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} /></div>
                <h4 className="font-semibold text-muted-foreground pt-4 border-t">Bank Details (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="bankName">Bank Name</Label><Input id="bankName" value={bankName} onChange={e => setBankName(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="ifsc">IFSC Code</Label><Input id="ifsc" value={ifscCode} onChange={e => setIfscCode(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="accountNumber">Account Number</Label><Input id="accountNumber" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} /></div>
              </div>
            </ScrollArea>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddEmployee}>Save Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPaySalaryOpen} onOpenChange={setIsPaySalaryOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Pay Salary to {selectedEmployee?.name}</DialogTitle>
                <DialogDescription>Record a new salary payment for this employee.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2"><Label htmlFor="pay-amount">Amount (₹)</Label><Input id="pay-amount" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={`Monthly: ₹${selectedEmployee?.monthlySalary.toLocaleString()}`} /></div>
                <div className="space-y-2"><Label htmlFor="pay-date">Payment Date</Label>
                    <Popover><PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !paymentDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />{paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} initialFocus /></PopoverContent></Popover>
                </div>
                <div className="space-y-2"><Label htmlFor="pay-notes">Notes (Optional)</Label><Textarea id="pay-notes" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="e.g., Full salary for Oct" /></div>
            </div>
             <DialogFooter>
                <DialogClose asChild><Button variant="outline" onClick={() => setSelectedEmployee(null)}>Cancel</Button></DialogClose>
                <Button onClick={handlePaySalary}>Record Payment</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
}

const SalaryPaymentHistory: React.FC<{ employee: Employee }> = ({ employee }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const isDemoMode = !user;
    
    const userDocRef = useMemoFirebase(() => {
        if (isDemoMode || !firestore) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore, isDemoMode]);
    const { data: userData } = useDoc(userDocRef);
    const shopId = userData?.shopId;

    const paymentsQuery = useMemoFirebase(() => {
        if (isDemoMode || !shopId || !firestore) return null;
        return query(collection(firestore, `shops/${shopId}/employees/${employee.id}/salaryPayments`), orderBy('paymentDate', 'desc'));
    }, [shopId, firestore, isDemoMode, employee.id]);

    const { data: paymentsData, isLoading } = useCollection<SalaryPayment>(paymentsQuery);

    if (isLoading && !isDemoMode) return <p>Loading payment history...</p>

    return (
        <div className="mt-4">
            <h5 className="font-semibold mb-2">Salary Payment History</h5>
            {paymentsData && paymentsData.length > 0 ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="text-right">Amount Paid</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paymentsData.map(p => (
                            <TableRow key={p.id}>
                                <TableCell>{format(new Date(p.paymentDate), 'dd MMM, yyyy')}</TableCell>
                                <TableCell>{p.notes}</TableCell>
                                <TableCell className="text-right font-semibold">₹{p.amount.toLocaleString('en-IN')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            ) : (
                <p className="text-sm text-muted-foreground">No salary payments recorded yet.</p>
            )}
        </div>
    )
}


    