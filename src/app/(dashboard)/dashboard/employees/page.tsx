
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
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { Search, PlusCircle, HandCoins, Calendar as CalendarIcon, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, doc, addDoc, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast.tsx';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
        upiId?: string;
    };
    salaryPayments?: SalaryPayment[];
};

type SalaryPayment = {
    id: string;
    paymentDate: string;
    amount: number;
    notes: string;
}

const demoEmployeesData: Employee[] = [
    { id: 'emp1', name: 'Arun Kumar', phone: '9876543210', address: '123 Main St, Delhi', role: 'Sales Manager', joiningDate: '2023-01-15T00:00:00.000Z', monthlySalary: 35000, bankDetails: { bankName: 'HDFC Bank', accountNumber: '...1234', ifscCode: 'HDFC000123', upiId: 'arun.kumar@okhdfc' }, salaryPayments: [{id: 'p1', paymentDate: new Date(Date.now() - 86400000 * 30).toISOString(), amount: 35000, notes: 'Salary for last month'}] },
    { id: 'emp2', name: 'Sunita Sharma', phone: '9876543211', address: '456 MG Road, Mumbai', role: 'Cashier', joiningDate: '2023-03-20T00:00:00.000Z', monthlySalary: 22000, bankDetails: { upiId: 'sunita@upi' }, salaryPayments: [] },
];

const SalaryPaymentHistory: React.FC<{ employee: Employee, isDemoMode: boolean }> = ({ employee, isDemoMode }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore || isDemoMode) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore, isDemoMode]);
    const { data: userData } = useDoc(userDocRef);
    const shopId = userData?.shopId;

    const paymentsQuery = useMemoFirebase(() => {
        if (isDemoMode || !shopId || !firestore) return null;
        return query(collection(firestore, `shops/${shopId}/employees/${employee.id}/salaryPayments`), orderBy('paymentDate', 'desc'));
    }, [shopId, firestore, isDemoMode, employee.id]);

    const { data: paymentsData, isLoading } = useCollection<SalaryPayment>(paymentsQuery);
    
    const data = isDemoMode ? employee.salaryPayments || [] : paymentsData;

    return (
        <div className="mt-4">
            <h5 className="font-semibold mb-2">Salary Payment History</h5>
            {isLoading && !isDemoMode ? <p>Loading payment history...</p> 
            : data && data.length > 0 ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="text-right">Amount Paid</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map(p => (
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

export default function EmployeesPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isPaySalaryOpen, setIsPaySalaryOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form state for new employee
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // Form state for salary payment
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>();

  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const [demoEmployees, setDemoEmployees] = useState(demoEmployeesData);
  
  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !firestore || !user) return null;
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
     let data = isDemoMode ? demoEmployees : (employeesData || []);
     if (searchTerm) {
        data = data.filter(employee => 
            employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (employee.phone && employee.phone.includes(searchTerm)) ||
            (employee.role && employee.role.toLowerCase().includes(searchTerm.toLowerCase()))
        );
     }
     return data;
  }, [employeesData, searchTerm, isDemoMode, demoEmployees]);
  
  const columns: ColumnDef<Employee>[] = [
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
            <Button size="sm" onClick={(e) => {
                e.stopPropagation();
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
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  
  const handleRowClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailsOpen(true);
  }

  const clearAddEmployeeForm = () => {
    setName('');
    setPhone('');
    setAddress('');
    setRole('');
    setJoiningDate('');
    setMonthlySalary('');
    setBankName('');
    setAccountNumber('');
    setIfscCode('');
    setUpiId('');
  }

  const handleAddEmployee = async () => {
    if (!name || !monthlySalary || !joiningDate) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Name, Joining Date and Monthly Salary are required.' });
        return;
    }
    const newEmployee = {
        id: `demo-${Date.now()}`,
        name,
        phone,
        address,
        role,
        joiningDate: new Date(joiningDate).toISOString(),
        monthlySalary: parseFloat(monthlySalary),
        bankDetails: { bankName, accountNumber, ifscCode, upiId },
        salaryPayments: []
    }
    
    if (isDemoMode) {
        setDemoEmployees(prev => [...prev, newEmployee]);
        toast({ title: 'Success (Demo)', description: `${name} has been added.`});
    } else {
         if (!shopId || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Shop not found.' });
            return;
        }
        const { id, ...employeeData } = newEmployee; // Don't save demo id to firestore
        const employeesCollection = collection(firestore, `shops/${shopId}/employees`);
        try {
            await addDoc(employeesCollection, employeeData);
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
      id: `demo-pay-${Date.now()}`,
      paymentDate: paymentDate.toISOString(),
      amount: parseFloat(paymentAmount),
      notes: paymentNotes
    };

    if (isDemoMode) {
        setDemoEmployees(prev => prev.map(emp => {
            if (emp.id === selectedEmployee.id) {
                return {
                    ...emp,
                    salaryPayments: [...(emp.salaryPayments || []), newPayment]
                }
            }
            return emp;
        }))
        toast({ title: 'Success (Demo)', description: `Paid ₹${paymentAmount} to ${selectedEmployee.name}.` });
    } else {
      if (!shopId || !firestore) return;
      const {id, ...paymentData} = newPayment;
      const paymentsCollection = collection(firestore, `shops/${shopId}/employees/${selectedEmployee.id}/salaryPayments`);
      try {
        await addDoc(paymentsCollection, paymentData);
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

  const handleWhatsApp = (employee: Employee) => {
    if (employee.phone) {
        window.open(`https://wa.me/${employee.phone}`, '_blank');
    } else {
        toast({ variant: 'destructive', title: 'No Phone Number', description: 'This employee does not have a phone number saved.' });
    }
  };

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
                  <TableRow key={row.id} onClick={() => handleRowClick(row.original)} className="cursor-pointer">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
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
                    <div className="space-y-2">
                      <Label htmlFor="joiningDate">Joining Date*</Label>
                      <Input id="joiningDate" type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2"><Label htmlFor="salary">Monthly Salary (₹)*</Label><Input id="salary" type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} /></div>
                <h4 className="font-semibold text-muted-foreground pt-4 border-t">Bank Details (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="bankName">Bank Name</Label><Input id="bankName" value={bankName} onChange={e => setBankName(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="ifsc">IFSC Code</Label><Input id="ifsc" value={ifscCode} onChange={e => setIfscCode(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="accountNumber">Account Number</Label><Input id="accountNumber" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="upiId">UPI ID</Label><Input id="upiId" value={upiId} onChange={e => setUpiId(e.target.value)} /></div>
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

      {selectedEmployee && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-2xl">{selectedEmployee.name}</DialogTitle>
                            <DialogDescription>{selectedEmployee.role}</DialogDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleWhatsApp(selectedEmployee)} disabled={!selectedEmployee.phone}>
                            <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
                        </Button>
                    </div>
                </DialogHeader>
                 <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-4 text-sm">
                        <h4 className="font-semibold text-muted-foreground">Contact & Role</h4>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                             <div className="flex justify-between"><span className="text-muted-foreground">Phone:</span><span className="font-medium">{selectedEmployee.phone || 'N/A'}</span></div>
                             <div className="flex justify-between"><span className="text-muted-foreground">Joining Date:</span><span className="font-medium">{format(new Date(selectedEmployee.joiningDate), 'dd MMM, yyyy')}</span></div>
                             <div className="flex justify-between col-span-2"><span className="text-muted-foreground">Address:</span><span className="font-medium text-right">{selectedEmployee.address || 'N/A'}</span></div>
                        </div>
                    </div>
                    <Separator />
                     <div className="space-y-4 text-sm">
                        <h4 className="font-semibold text-muted-foreground">Bank & UPI Details</h4>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                             <div className="flex justify-between"><span className="text-muted-foreground">Bank:</span><span className="font-medium">{selectedEmployee.bankDetails?.bankName || 'N/A'}</span></div>
                             <div className="flex justify-between"><span className="text-muted-foreground">Account No:</span><span className="font-medium">{selectedEmployee.bankDetails?.accountNumber || 'N/A'}</span></div>
                             <div className="flex justify-between"><span className="text-muted-foreground">IFSC:</span><span className="font-medium">{selectedEmployee.bankDetails?.ifscCode || 'N/A'}</span></div>
                             <div className="flex justify-between"><span className="text-muted-foreground">UPI ID:</span><span className="font-medium">{selectedEmployee.bankDetails?.upiId || 'N/A'}</span></div>
                        </div>
                    </div>
                    <Separator />
                    <SalaryPaymentHistory employee={selectedEmployee} isDemoMode={isDemoMode} />
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsDetailsOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

    </Card>
  );
}
