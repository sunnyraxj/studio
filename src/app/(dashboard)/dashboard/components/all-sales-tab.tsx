
'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  SortingState,
  ExpandedState,
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CaretSortIcon, ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { X, Search, Printer, Receipt } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Sale } from '../page';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs, where, Query, DocumentData, getCountFromServer, doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DetailedInvoice } from './detailed-invoice';
import { CompactReceipt } from './compact-receipt';


interface AllSalesTabProps {
  isDemoMode: boolean;
  demoSales: Sale[];
  setDemoSales: React.Dispatch<React.SetStateAction<Sale[]>>;
}

export function AllSalesTab({ isDemoMode, demoSales, setDemoSales }: AllSalesTabProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !firestore || !user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;
  
  const settingsDocRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return doc(firestore, `shops/${shopId}/settings`, 'details');
  }, [firestore, shopId, isDemoMode]);
  const { data: shopSettings } = useDoc(settingsDocRef);

  const [data, setData] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 30,
  });

  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [startDay, setStartDay] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endDay, setEndDay] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const invoiceRef = useRef(null);
  const receiptRef = useRef(null);
  
  const handlePrint = (type: 'invoice' | 'receipt') => {
    const printContentRef = type === 'invoice' ? invoiceRef : receiptRef;
    const printTitle = type === 'invoice' ? 'Print Invoice' : 'Print Receipt';
    
    const printContent = printContentRef.current;
    if (printContent) {
        const newWindow = window.open('', '_blank', 'width=800,height=600');
        if (newWindow) {
            const printableContent = (printContent as HTMLDivElement).innerHTML;
            
            newWindow.document.write(`<html><head><title>${printTitle}</title>`);
            const styles = Array.from(document.styleSheets)
              .map(styleSheet => {
                  try {
                      return Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('');
                  } catch (e) {
                      console.log('Access to stylesheet %s is denied. Skipping.', styleSheet.href);
                      return '';
                  }
              }).join('');
            
            newWindow.document.write(`<style>${styles}</style>`);
            newWindow.document.write('</head><body>');
            newWindow.document.write(printableContent);
            newWindow.document.write('</body></html>');
            newWindow.document.close();
            newWindow.focus();
            setTimeout(() => {
                newWindow.print();
                newWindow.close();
            }, 500);
        }
    }
  };
  
  const salesColumns: ColumnDef<Sale>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        return row.getCanExpand() ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={row.getToggleExpandedHandler()}
            className="h-6 w-6"
          >
            {row.getIsExpanded() ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </Button>
        ) : null;
      },
    },
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice #',
      cell: ({ row }) => <Badge variant="outline">{row.getValue('invoiceNumber')}</Badge>,
    },
    {
      accessorKey: 'customer.name',
      header: 'Customer',
      cell: ({ row }) => <div className="font-medium">{row.original.customer.name}</div>,
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
      accessorKey: 'total',
      header: ({ column }) => (
        <Button variant="ghost" className='w-full justify-end' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Amount <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-right font-semibold">₹{row.original.total.toLocaleString('en-IN')}</div>,
    },
    {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          return (
            <div className="text-right space-x-2">
                <Button variant="outline" size="sm" onClick={() => { setSelectedSale(row.original); setIsReceiptOpen(true); }}>
                    <Receipt className="h-4 w-4 mr-2"/> Print Receipt
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedSale(row.original); setIsInvoiceOpen(true); }}>
                    <Printer className="h-4 w-4 mr-2"/> Print A4
                </Button>
            </div>
          );
        },
    },
  ];

  
  const buildQuery = () => {
    if (isDemoMode) return null;
    if (!firestore || !shopId) return null;

    const salesCollectionRef = collection(firestore, `shops/${shopId}/sales`);
    let q: Query = salesCollectionRef;
    
    const queryConstraints = [];
    
    if (sorting.length > 0) {
      queryConstraints.push(orderBy(sorting[0].id, sorting[0].desc ? 'desc' : 'asc'));
    } else {
      queryConstraints.push(orderBy('date', 'desc'));
    }

    const startDateStr = `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
    const endDateStr = `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);
    
    const isValidStartDate = !isNaN(startDate.getTime()) && startDay && startMonth && startYear;
    const isValidEndDate = !isNaN(endDate.getTime()) && endDay && endMonth && endYear;
    
    if (isValidStartDate) queryConstraints.push(where('date', '>=', startDate.toISOString()));
    if (isValidEndDate) queryConstraints.push(where('date', '<=', endDate.toISOString()));
    
    if (searchTerm) {
        queryConstraints.push(where('customer.name', '>=', searchTerm));
        queryConstraints.push(where('customer.name', '<=', searchTerm + '\uf8ff'));
    }
    
    return query(salesCollectionRef, ...queryConstraints);
  }

  const fetchData = async () => {
    if (isDemoMode) {
      setData(demoSales);
      setPageCount(Math.ceil(demoSales.length / pageSize));
      return;
    }

    const q = buildQuery();
    if (!q) return;

    setIsLoading(true);

    try {
      const countSnapshot = await getCountFromServer(q);
      setPageCount(Math.ceil(countSnapshot.data().count / pageSize));

      let finalQuery: Query = q;
      if (pageIndex > 0 && lastVisible) {
        finalQuery = query(q, startAfter(lastVisible), limit(pageSize));
      } else {
        finalQuery = query(q, limit(pageSize));
      }

      const querySnapshot = await getDocs(finalQuery);
      const sales: Sale[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      setData(sales);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      let filtered = demoSales;

      if (searchTerm) {
        filtered = filtered.filter(s => 
            s.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      
      const startDate = new Date(`${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`);
      const endDate = new Date(`${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`);
      endDate.setHours(23, 59, 59, 999);
      
      const isValidStartDate = !isNaN(startDate.getTime()) && startDay && startMonth && startYear;
      const isValidEndDate = !isNaN(endDate.getTime()) && endDay && endMonth && endYear;

      if (isValidStartDate) filtered = filtered.filter(s => new Date(s.date) >= startDate);
      if (isValidEndDate) filtered = filtered.filter(s => new Date(s.date) <= endDate);

      setData(filtered);
      setPageCount(Math.ceil(filtered.length / pageSize));
    } else {
      fetchData();
    }
  }, [shopId, pageIndex, pageSize, sorting, isFilterActive, isDemoMode, demoSales, searchTerm, startDay, startMonth, startYear, endDay, endMonth, endYear]);

  const handleFilter = () => {
    setPageIndex(0);
    setLastVisible(null);
    setIsFilterActive(prev => !prev);
  };
  
  const handleClearFilter = () => {
    setStartDay('');
    setStartMonth('');
    setStartYear('');
    setEndDay('');
    setEndMonth('');
    setEndYear('');
    setSearchTerm('');
    setPageIndex(0);
    setLastVisible(null);
    if(isFilterActive) {
      setIsFilterActive(prev => !prev);
    }
  }

  const isAnyFilterApplied = !!(searchTerm || startDay || endDay);

  const table = useReactTable({
    data: isDemoMode ? data : data,
    columns: salesColumns,
    pageCount,
    state: { sorting, expanded, pagination: { pageIndex, pageSize } },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle>All Sales</CardTitle>
            <CardDescription>A complete list of all your transactions.</CardDescription>
          </div>
           <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
             <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by customer or invoice..."
                    className="pl-8 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex flex-col sm:flex-row items-end gap-2 p-2 border rounded-lg bg-muted/50 w-full sm:w-auto">
                <div className="grid gap-1.5 w-full sm:w-auto">
                  <Label className="text-xs">Start Date</Label>
                  <div className="flex gap-1">
                      <Input placeholder="DD" value={startDay} onChange={e => setStartDay(e.target.value)} className="w-full h-8" />
                      <Input placeholder="MM" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="w-full h-8" />
                      <Input placeholder="YYYY" value={startYear} onChange={e => setStartYear(e.target.value)} className="w-full h-8" />
                  </div>
                </div>
                <div className="grid gap-1.5 w-full sm:w-auto">
                  <Label className="text-xs">End Date</Label>
                   <div className="flex gap-1">
                      <Input placeholder="DD" value={endDay} onChange={e => setEndDay(e.target.value)} className="w-full h-8" />
                      <Input placeholder="MM" value={endMonth} onChange={e => setEndMonth(e.target.value)} className="w-full h-8" />
                      <Input placeholder="YYYY" value={endYear} onChange={e => setEndYear(e.target.value)} className="w-full h-8" />
                  </div>
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                    <Button onClick={handleFilter} size="sm" className="w-full">Filter</Button>
                    {isAnyFilterApplied && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearFilter}>
                          <X className="h-4 w-4" />
                          <span className="sr-only">Clear Filter</span>
                      </Button>
                    )}
                </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
            <TableBody>
              {isLoading && !isDemoMode ? <TableRow><TableCell colSpan={salesColumns.length} className="h-24 text-center">Loading sales...</TableCell></TableRow>
                : table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => (
                  <React.Fragment key={row.id}>
                    <TableRow data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {row.getIsExpanded() && (
                      <TableRow>
                        <TableCell colSpan={salesColumns.length} className="p-0">
                          <div className="p-4 bg-muted/50">
                            <h4 className="font-bold mb-2">Items in Invoice #{row.original.invoiceNumber}</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead className="text-center">Quantity</TableHead>
                                  <TableHead className="text-right">Price</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {row.original.items.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">₹{item.price.toLocaleString('en-IN')}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )) : <TableRow><TableCell colSpan={salesColumns.length} className="h-24 text-center">No sales found for the selected period.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="py-4"><DataTablePagination table={table} /></div>
      </CardContent>
    </Card>

    <Dialog open={isInvoiceOpen} onOpenChange={(open) => { if (!open) { setIsInvoiceOpen(false); setSelectedSale(null); }}}>
        <DialogContent className="max-w-4xl p-0 border-0">
            <DialogHeader className="p-4 flex flex-row items-center justify-between">
                <div>
                    <DialogTitle>A4 Invoice #{selectedSale?.invoiceNumber}</DialogTitle>
                    <DialogDescription>
                        A preview of the detailed invoice for printing.
                    </DialogDescription>
                </div>
                <Button size="sm" onClick={() => handlePrint('invoice')}>
                    <Printer className="mr-2 h-4 w-4" /> Print A4
                </Button>
            </DialogHeader>
             <div className="max-h-[80vh] overflow-y-auto">
                <div ref={invoiceRef}>
                    <DetailedInvoice sale={selectedSale} settings={shopSettings} />
                </div>
             </div>
        </DialogContent>
    </Dialog>

    <Dialog open={isReceiptOpen} onOpenChange={(open) => { if (!open) { setIsReceiptOpen(false); setSelectedSale(null); }}}>
        <DialogContent className="max-w-sm p-0 border-0">
             <DialogHeader className="p-4 flex flex-row items-center justify-between">
                <div>
                    <DialogTitle>Receipt #{selectedSale?.invoiceNumber}</DialogTitle>
                    <DialogDescription>
                        A preview of the compact receipt.
                    </DialogDescription>
                </div>
                <Button size="sm" onClick={() => handlePrint('receipt')}>
                    <Receipt className="mr-2 h-4 w-4" /> Print Receipt
                </Button>
            </DialogHeader>
             <div className="max-h-[80vh] overflow-y-auto px-2">
                <div ref={receiptRef}>
                    <CompactReceipt sale={selectedSale} settings={shopSettings} />
                </div>
             </div>
        </DialogContent>
    </Dialog>
    </>
  );
}
