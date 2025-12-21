'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileDown, ReceiptText } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Types
type Sale = {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    phone?: string;
    address?: string;
    pin?: string;
    state?: string;
    gstin?: string;
  };
  date: string;
  total: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  items: SaleItem[];
  paymentMode: 'cash' | 'card' | 'upi' | 'both';
};

type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  gst?: number;
};

type GstReportItem = {
    invoiceDate: string;
    invoiceNumber: string;
    customerName: string;
    customerGstin?: string;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalGst: number;
    invoiceTotal: number;
};

type UserProfile = {
  shopId?: string;
};

type ShopSettings = {
    companyState?: string;
};

const demoSales: Sale[] = [
    { id: '1', invoiceNumber: 'D-INV-001', customer: { name: 'Demo Customer 1', state: 'Assam', gstin: '18ABCDE1234F1Z5' }, date: new Date().toISOString(), total: 1120, subtotal: 1000, cgst: 60, sgst: 60, igst: 0, items: [], paymentMode: 'cash' },
    { id: '2', invoiceNumber: 'D-INV-002', customer: { name: 'Demo Customer 2', state: 'Delhi' }, date: new Date().toISOString(), total: 2240, subtotal: 2000, cgst: 0, sgst: 0, igst: 240, items: [], paymentMode: 'upi' },
    { id: '3', invoiceNumber: 'D-INV-003', customer: { name: 'Demo Customer 3', state: 'Assam' }, date: new Date(new Date().setDate(new Date().getDate() - 35)).toISOString(), total: 560, subtotal: 500, cgst: 30, sgst: 30, igst: 0, items: [], paymentMode: 'card' },
];


// Main GST Page Component
export default function GstReportsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const isDemoMode = !user;

    const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [invoiceType, setInvoiceType] = useState('All');

    const userDocRef = useMemoFirebase(() => {
        if (isDemoMode || !user || !firestore) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore, isDemoMode]);
    const { data: userData } = useDoc<UserProfile>(userDocRef);
    const shopId = userData?.shopId;
    
    const settingsDocRef = useMemoFirebase(() => {
        if (isDemoMode || !shopId || !firestore) return null;
        return doc(firestore, `shops/${shopId}/settings`, 'details');
    }, [firestore, shopId, isDemoMode]);
    const { data: shopSettings } = useDoc<ShopSettings>(settingsDocRef);
    const shopState = isDemoMode ? 'Assam' : shopSettings?.companyState || 'Assam';

    // Fetch sales for the selected month and year
    const salesQuery = useMemoFirebase(() => {
        if (isDemoMode || !shopId || !firestore) return null;
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

        return query(
            collection(firestore, `shops/${shopId}/sales`),
            where('date', '>=', startDate.toISOString()),
            where('date', '<=', endDate.toISOString()),
            orderBy('date', 'desc')
        );
    }, [shopId, firestore, month, year, isDemoMode]);

    const { data: salesData, isLoading: isSalesLoading } = useCollection<Sale>(salesQuery);
    
    const { gstReportData, totals } = useMemo(() => {
        let sourceData = isDemoMode ? demoSales : (salesData || []);
        
        // Filter by month/year for demo data
        if (isDemoMode) {
            sourceData = sourceData.filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate.getFullYear().toString() === year && (saleDate.getMonth() + 1).toString() === month;
            });
        }

        let filteredSales = sourceData;

        if (invoiceType === 'B2B') {
            filteredSales = filteredSales.filter(sale => sale.customer.gstin);
        } else if (invoiceType === 'B2C') {
            filteredSales = filteredSales.filter(sale => !sale.customer.gstin);
        }

        const reportItems: GstReportItem[] = filteredSales.map(sale => {
            return {
                invoiceDate: sale.date,
                invoiceNumber: sale.invoiceNumber,
                customerName: sale.customer.name,
                customerGstin: sale.customer.gstin,
                taxableAmount: sale.subtotal,
                cgstAmount: sale.cgst,
                sgstAmount: sale.sgst,
                igstAmount: sale.igst,
                totalGst: sale.cgst + sale.sgst + sale.igst,
                invoiceTotal: sale.total,
            };
        });
        
        const totals = reportItems.reduce((acc, item) => {
            acc.taxableSales += item.taxableAmount;
            acc.cgst += item.cgstAmount;
            acc.sgst += item.sgstAmount;
            acc.igst += item.igstAmount;
            return acc;
        }, { taxableSales: 0, cgst: 0, sgst: 0, igst: 0 });

        return { gstReportData: reportItems, totals };
    }, [salesData, invoiceType, shopState, isDemoMode, month, year]);

    const [sorting, setSorting] = React.useState<SortingState>([
        { id: 'invoiceDate', desc: true },
    ]);

    const columns: ColumnDef<GstReportItem>[] = [
        { accessorKey: 'invoiceDate', header: 'Invoice Date', cell: ({ row }) => format(new Date(row.getValue('invoiceDate')), 'dd MMM yyyy') },
        { accessorKey: 'invoiceNumber', header: 'Invoice #' },
        { accessorKey: 'customerName', header: 'Customer Name' },
        { accessorKey: 'customerGstin', header: 'Customer GSTIN', cell: ({row}) => row.getValue('customerGstin') || '-' },
        { accessorKey: 'taxableAmount', header: 'Taxable Amount', cell: ({ row }) => `₹${row.original.taxableAmount.toFixed(2)}` },
        { accessorKey: 'cgstAmount', header: 'CGST', cell: ({ row }) => `₹${row.original.cgstAmount.toFixed(2)}` },
        { accessorKey: 'sgstAmount', header: 'SGST', cell: ({ row }) => `₹${row.original.sgstAmount.toFixed(2)}` },
        { accessorKey: 'igstAmount', header: 'IGST', cell: ({ row }) => `₹${row.original.igstAmount.toFixed(2)}` },
        { accessorKey: 'totalGst', header: 'Total GST', cell: ({ row }) => `₹${row.original.totalGst.toFixed(2)}` },
        { accessorKey: 'invoiceTotal', header: 'Invoice Total', cell: ({ row }) => `₹${row.original.invoiceTotal.toFixed(2)}` },
    ];

    const table = useReactTable({
        data: gstReportData,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    
    const handleExport = (type: 'detailed' | 'summary') => {
        const monthName = format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM');
        if (type === 'detailed') {
            const dataToExport = gstReportData.map(item => ({
                'Invoice Date': format(new Date(item.invoiceDate), 'dd-MM-yyyy'),
                'Invoice Number': item.invoiceNumber,
                'Customer Name': item.customerName,
                'Customer GSTIN': item.customerGstin,
                'Taxable Amount': item.taxableAmount,
                'CGST': item.cgstAmount,
                'SGST': item.sgstAmount,
                'IGST': item.igstAmount,
                'Total GST': item.totalGst,
                'Invoice Total': item.invoiceTotal,
            }));
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, `GST Report ${monthName} ${year}`);
            XLSX.writeFile(workbook, `GST_Report_${monthName}_${year}.xlsx`);
        } else { // Summary
            const summaryData = [
                { 'Metric': 'Month', 'Value': `${monthName} ${year}` },
                {},
                { 'Metric': 'Total Taxable Sales', 'Value': totals.taxableSales },
                { 'Metric': 'Total CGST', 'Value': totals.cgst },
                { 'Metric': 'Total SGST', 'Value': totals.sgst },
                { 'Metric': 'Total IGST', 'Value': totals.igst },
                {},
                { 'Metric': 'Total GST Collected', 'Value': totals.cgst + totals.sgst + totals.igst },
            ];
            const worksheet = XLSX.utils.json_to_sheet(summaryData, { skipHeader: true });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, `GST Summary ${monthName} ${year}`);
            XLSX.writeFile(workbook, `GST_Summary_${monthName}_${year}.xlsx`);
        }
    }

    const totalGstCollected = totals.cgst + totals.sgst + totals.igst;
    
    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
    const months = [
        { value: '1', label: 'January' }, { value: '2', label: 'February' },
        { value: '3', label: 'March' }, { value: '4', label: 'April' },
        { value: '5', label: 'May' }, { value: '6', label: 'June' },
        { value: '7', label: 'July' }, { value: '8', label: 'August' },
        { value: '9', label: 'September' }, { value: '10', label: 'October' },
        { value: '11', label: 'November' }, { value: '12', label: 'December' },
    ];


    return (
        <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">GST Reports</h2>
                    <p className="text-muted-foreground">
                        View and export your monthly GST data.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Monthly GST Dashboard</CardTitle>
                            <CardDescription>Summary of GST for the selected period.</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard title="Total Taxable Sales" value={totals.taxableSales} isLoading={isSalesLoading && !isDemoMode} />
                        <StatCard title="Total CGST" value={totals.cgst} isLoading={isSalesLoading && !isDemoMode} />
                        <StatCard title="Total SGST" value={totals.sgst} isLoading={isSalesLoading && !isDemoMode} />
                        <StatCard title="Total IGST" value={totals.igst} isLoading={isSalesLoading && !isDemoMode} />
                    </div>
                     <div className="mt-6 rounded-lg bg-muted/50 p-6 text-center">
                        <p className="text-sm font-medium text-muted-foreground">Total GST Payable for {format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy')}</p>
                        {isSalesLoading && !isDemoMode ? <Skeleton className="h-9 w-40 mx-auto mt-2" /> : <p className="text-3xl font-bold">₹{totalGstCollected.toFixed(2)}</p>}
                    </div>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <div className="flex justify-between items-center">
                         <div>
                            <CardTitle>Invoice-wise GST Report</CardTitle>
                            <CardDescription>Detailed breakdown of GST for each invoice.</CardDescription>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4">
                                <Label className="font-semibold">Invoice Type:</Label>
                                <RadioGroup value={invoiceType} onValueChange={setInvoiceType} className="flex items-center gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="All" id="all-inv" />
                                        <Label htmlFor="all-inv">All</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="B2B" id="b2b-inv" />
                                        <Label htmlFor="b2b-inv">B2B</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="B2C" id="b2c-inv" />
                                        <Label htmlFor="b2c-inv">B2C</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleExport('detailed')} disabled={gstReportData.length === 0}>
                                    <FileDown className="mr-2 h-4 w-4" /> Export Detailed
                                </Button>
                                 <Button variant="outline" size="sm" onClick={() => handleExport('summary')} disabled={gstReportData.length === 0}>
                                    <ReceiptText className="mr-2 h-4 w-4" /> Export Summary
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map(hg => (
                                    <TableRow key={hg.id}>
                                        {hg.headers.map(h => (
                                            <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {isSalesLoading && !isDemoMode ? (
                                    <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading report...</TableCell></TableRow>
                                ) : table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map(row => (
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map(cell => (
                                                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No invoices found for the selected period.</TableCell></TableRow>
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

// Helper component for stat cards
const StatCard = ({ title, value, isLoading }: { title: string, value: number, isLoading: boolean }) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">₹{value.toFixed(2)}</div>}
        </CardContent>
    </Card>
);
