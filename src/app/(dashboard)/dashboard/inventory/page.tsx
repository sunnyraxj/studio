
'use client';

import {
  CaretSortIcon,
  ChevronDownIcon,
  DotsHorizontalIcon,
} from '@radix-ui/react-icons';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  PaginationState,
} from '@tanstack/react-table';
import * as React from 'react';
import Link from 'next/link';
import { format, differenceInDays, isBefore } from 'date-fns';
import { collection, doc, query, orderBy, limit, startAfter, getDocs, Query, DocumentData, endBefore, limitToLast } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, FileDown } from 'lucide-react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast.tsx';

const demoData: InventoryItem[] = [
  // ... (existing demo data)
];

export type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  margin: number;
  status: 'in stock' | 'low stock' | 'out of stock';
  dateAdded: string; // Stored as ISO string
  expiryDate?: string | null; // Stored as 'YYYY-MM-DD'
  category: string;
  size: string;
  gst: number;
  hsn: string;
  unit: string;
};

type UserProfile = {
  shopId?: string;
}

export const columns: ColumnDef<InventoryItem>[] = [
  // ... (existing columns definition)
    {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <div className="capitalize font-medium">{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <div>{row.getValue('category')}</div>,
  },
  {
    accessorKey: 'size',
    header: 'Size',
    cell: ({ row }) => <div>{row.getValue('size')}</div>,
  },
  {
    accessorKey: 'stock',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Stock
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-center">{`${row.getValue('stock')} ${row.original.unit}`}</div>,
  },
    {
    accessorKey: 'price',
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="text-right w-full"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        MRP
        <CaretSortIcon className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const price = parseFloat(row.getValue('price'));

      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(price);

      return <div className="text-right font-medium">{formatted}</div>;
    },
    filterFn: (row, columnId, filterValue) => {
        const rowValue = row.getValue(columnId) as number;
        return String(rowValue).includes(String(filterValue));
    }
  },
  {
    accessorKey: 'margin',
    header: () => <div className="text-center">Margin (%)</div>,
    cell: ({ row }) => <div className="text-center">{`${row.getValue('margin')}%`}</div>,
  },
  {
    accessorKey: 'gst',
    header: () => <div className="text-center">GST (%)</div>,
    cell: ({ row }) => <div className="text-center">{`${row.getValue('gst')}%`}</div>,
  },
  {
    accessorKey: 'hsn',
    header: 'HSN Code',
    cell: ({ row }) => <div>{row.getValue('hsn')}</div>,
  },
  {
    accessorKey: 'sku',
    header: 'SKU',
    cell: ({ row }) => <div>{row.getValue('sku')}</div>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      let variant: 'default' | 'secondary' | 'destructive' = 'default';
      if (status === 'low stock') variant = 'secondary';
      if (status === 'out of stock') variant = 'destructive';

      return (
        <Badge variant={variant} className="capitalize">
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'dateAdded',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date Added
        <CaretSortIcon className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue('dateAdded'));
      return <div>{format(date, 'dd MMM yyyy')}</div>;
    },
  },
  {
    accessorKey: 'expiryDate',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Expiry Date
        <CaretSortIcon className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const expiryDate = row.getValue('expiryDate') as string | undefined | null;
      if (!expiryDate) return <div className="text-center">-</div>;

      const date = new Date(expiryDate);
      const today = new Date();
      const isExpired = isBefore(date, today);
      const daysLeft = differenceInDays(date, today);
      
      const isExpiringSoon = !isExpired && daysLeft <= 30;

      return (
        <div className={cn(
          "text-left",
          isExpired ? "text-destructive font-bold" : "",
          isExpiringSoon ? "text-yellow-600 font-semibold" : ""
        )}>
          {format(date, 'dd MMM yyyy')}
          {isExpired && <Badge variant="destructive" className="ml-2">Expired</Badge>}
          {isExpiringSoon && <Badge variant="secondary" className="ml-2">{daysLeft} days left</Badge>}
        </div>
      );
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const item = row.original;
      const { user } = useUser();
      const isDemoMode = !user;

      const handleAction = (action: string) => {
        if (isDemoMode) {
          toast({
            title: `Action: ${action} (Demo)`,
            description: `This action was simulated for product: ${item.name}`,
          });
        } else {
          // Implement actual logic here for logged-in users
          toast({
            title: 'Coming Soon!',
            description: `${action} functionality is being implemented.`,
          });
        }
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleAction('Edit Product')}>
              Edit product
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('Print Barcode')}>
              Print barcode
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function InventoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const isDemoMode = !user;
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);
  const { data: userData } = useDoc<UserProfile>(userDocRef);
  const shopId = userData?.shopId;

  const [data, setData] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [pageCount, setPageCount] = React.useState(0);
  const [lastVisible, setLastVisible] = React.useState<DocumentData | null>(null);
  const [firstVisible, setFirstVisible] = React.useState<DocumentData | null>(null);

  const [{ pageIndex, pageSize }, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 30,
  });

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'dateAdded', desc: true }
  ]);
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
        hsn: false,
        sku: false,
        margin: false,
    });
  const [rowSelection, setRowSelection] = React.useState({});
  const [searchBy, setSearchBy] = React.useState('name');
  const [filterValue, setFilterValue] = React.useState('');

  const fetchData = React.useCallback(async (pagination: PaginationState, sorting: SortingState) => {
    if (isDemoMode) {
        setData(demoData);
        return;
    }
    if (!firestore || !shopId) return;

    setIsLoading(true);

    const productsCollectionRef = collection(firestore, `shops/${shopId}/products`);
    
    const sortField = sorting.length > 0 ? sorting[0].id : 'dateAdded';
    const sortDirection = sorting.length > 0 && sorting[0].desc ? 'desc' : 'asc';
    
    let q: Query;
    
    if (pagination.pageIndex > 0 && lastVisible) {
        q = query(productsCollectionRef, orderBy(sortField, sortDirection), startAfter(lastVisible), limit(pagination.pageSize));
    } else {
        q = query(productsCollectionRef, orderBy(sortField, sortDirection), limit(pagination.pageSize));
    }

    try {
        const querySnapshot = await getDocs(q);
        const products: InventoryItem[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        setData(products);

        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setFirstVisible(querySnapshot.docs[0]);
        
        // This is a simplification. For accurate page count, you'd need a separate count query.
        // For now, we'll just set it high to allow navigation.
        setPageCount(Math.ceil(1000 / pageSize)); // Placeholder for total count

    } catch (error) {
        console.error("Error fetching inventory:", error);
    } finally {
        setIsLoading(false);
    }
  }, [firestore, shopId, isDemoMode, lastVisible, pageSize]);

  React.useEffect(() => {
    fetchData({ pageIndex, pageSize }, sorting);
  }, [fetchData, pageIndex, pageSize, sorting]);


  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: { pageIndex, pageSize },
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilterValue(value);
    table.getColumn(searchBy)?.setFilterValue(value);
  };

  const handleSearchByChange = (value: string) => {
    table.getColumn(searchBy)?.setFilterValue('');
    setSearchBy(value);
    if (filterValue) {
      table.getColumn(value)?.setFilterValue(filterValue);
    }
  };

  const handleExport = () => {
    // This would need to be adapted to fetch all data for export, or export current view
    const dataToExport = table.getFilteredRowModel().rows.map(row => {
        const { expiryDate, ...rest } = row.original;
        return {
            ...rest,
            'Expiry Date': expiryDate ? format(new Date(expiryDate), 'yyyy-MM-dd') : '',
        }
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, `InventoryExport-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-4">
        <div className="flex gap-4">
            <Input
            placeholder={`Filter by ${searchBy}...`}
            value={filterValue}
            onChange={handleFilterChange}
            className="max-w-sm"
            />
            <RadioGroup
                value={searchBy}
                onValueChange={handleSearchByChange}
                className="flex items-center space-x-4"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="name" id="name" />
                    <Label htmlFor="name">Name</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="category" id="category" />
                    <Label htmlFor="category">Category</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="price" id="price" />
                    <Label htmlFor="price">MRP</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sku" id="sku" />
                    <Label htmlFor="sku">Code</Label>
                </div>
            </RadioGroup>
        </div>
        <div className="ml-auto flex items-center gap-2">
           <Link href="/dashboard/inventory/add">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
           </Link>
           <Button variant="outline" onClick={handleExport}>
              <FileDown className="mr-2 h-4 w-4" /> Export
           </Button>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                Columns <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                    return (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                        }
                    >
                        {column.id === 'dateAdded' ? 'Date Added' : column.id === 'expiryDate' ? 'Expiry Date' : column.id}
                    </DropdownMenuCheckboxItem>
                    );
                })}
            </DropdownMenuContent>
            </DropdownMenu>
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading products...
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
                  {isDemoMode ? "No demo products." : "No products found. Add your first product!"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="py-4">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
