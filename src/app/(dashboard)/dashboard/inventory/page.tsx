
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
import { collection, doc, query, orderBy, onSnapshot, Query } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
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
import { PlusCircle, FileDown, ScanBarcode, IndianRupee } from 'lucide-react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast.tsx';
import { BarcodeDialog } from './components/barcode-dialog';

const demoData: InventoryItem[] = [
    { id: '1', name: 'Cotton T-Shirt', sku: 'DEMO-TS-M', stock: 85, price: 499, margin: 30, status: 'in stock', dateAdded: '2023-10-01T10:00:00Z', expiryDate: null, category: 'Apparel', material: 'Cotton', size: 'M', gst: 5, hsn: '6109' , unit: 'pcs'},
    { id: '2', name: 'Denim Jeans', sku: 'DEMO-JN-32', stock: 40, price: 1999, margin: 40, status: 'in stock', dateAdded: '2023-09-15T10:00:00Z', expiryDate: null, category: 'Apparel', material: 'Denim', size: '32', gst: 5, hsn: '6203', unit: 'pcs' },
    { id: '3', name: 'Leather Jacket', sku: 'DEMO-LJ-L', stock: 9, price: 4999, margin: 50, status: 'low stock', dateAdded: '2023-08-20T10:00:00Z', expiryDate: null, category: 'Apparel', material: 'Leather', size: 'L', gst: 18, hsn: '4203', unit: 'pcs' },
    { id: '4', name: 'Milk', sku: 'DEMO-MLK-1L', stock: 15, price: 60, margin: 10, status: 'in stock', dateAdded: '2023-10-25T10:00:00Z', expiryDate: new Date(Date.now() + 2 * 86400000).toISOString(), category: 'Groceries', material: 'Dairy', size: '1L', gst: 0, hsn: '0401', unit: 'ltr' },
    { id: '5', name: 'Bread', sku: 'DEMO-BRD-WH', stock: 3, price: 40, margin: 15, status: 'low stock', dateAdded: '2023-10-26T10:00:00Z', expiryDate: new Date(Date.now() + 1 * 86400000).toISOString(), category: 'Bakery', material: 'Wheat', size: '400g', gst: 0, hsn: '1905', unit: 'pcs' },
    { id: '6', name: 'Expired Ghee', sku: 'DEMO-GHE-EXP', stock: 10, price: 500, margin: 20, status: 'in stock', dateAdded: '2023-01-01T10:00:00Z', expiryDate: new Date(Date.now() - 5 * 86400000).toISOString(), category: 'Groceries', material: 'Dairy', size: '1kg', gst: 12, hsn: '0405', unit: 'kg' },
    { id: '7', name: 'Running Shoes', sku: 'DEMO-SHOE-9', stock: 0, price: 2500, margin: 35, status: 'out of stock', dateAdded: '2023-07-01T10:00:00Z', expiryDate: null, category: 'Footwear', material: 'Mesh', size: '9', gst: 18, hsn: '6404', unit: 'pair' },
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
  material: string;
  size: string;
  gst: number;
  hsn: string;
  unit: string;
};

type UserProfile = {
  shopId?: string;
}

type ShopSettings = {
    companyName?: string;
}


export default function InventoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const isDemoMode = !user;
  
  const userDocRef = useMemoFirebase(() => {
    if (isDemoMode || !user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore, isDemoMode]);
  const { data: userData } = useDoc<UserProfile>(userDocRef);
  const shopId = userData?.shopId;
  
  const settingsDocRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return doc(firestore, `shops/${shopId}/settings`, 'details');
  }, [shopId, firestore, isDemoMode]);
  const { data: shopSettings } = useDoc<ShopSettings>(settingsDocRef);
  const shopName = isDemoMode ? 'Demo Shop' : shopSettings?.companyName || 'My Shop';

  const [data, setData] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = React.useState(false);
  const [selectedItemForBarcode, setSelectedItemForBarcode] = React.useState<InventoryItem | null>(null);

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
        material: false,
    });
  const [searchBy, setSearchBy] = React.useState('name');
  const [filterValue, setFilterValue] = React.useState('');

  const columns: ColumnDef<InventoryItem>[] = [
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
      accessorKey: 'material',
      header: 'Material',
      cell: ({ row }) => <div>{row.getValue('material')}</div>,
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
        return <div className="text-right font-medium flex items-center justify-end gap-1"><IndianRupee className="h-4 w-4"/>{price.toLocaleString('en-IN')}</div>;
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
              <DropdownMenuItem onClick={() => {
                setSelectedItemForBarcode(item);
                setIsBarcodeDialogOpen(true);
              }}>
                <ScanBarcode className="mr-2 h-4 w-4" /> Print Barcode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: "Coming soon!", description: "Editing functionality is being implemented." })}>
                Edit product
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  React.useEffect(() => {
    if (isDemoMode) {
      setData(demoData);
      setIsLoading(false);
      return;
    }
    if (!firestore || !shopId) {
      setIsLoading(false);
      return;
    };

    setIsLoading(true);

    const productsCollectionRef = collection(firestore, `shops/${shopId}/products`);
    
    const sortField = sorting.length > 0 ? sorting[0].id : 'dateAdded';
    const sortDirection = sorting.length > 0 && sorting[0].desc ? 'desc' : 'asc';
    
    const q: Query = query(productsCollectionRef, orderBy(sortField, sortDirection));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const products: InventoryItem[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        setData(products);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching inventory:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, shopId, isDemoMode, sorting]);


  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: { pageIndex, pageSize },
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
    <>
    <div className="w-full">
      <div className="flex items-center py-2 gap-4">
        <div className="flex gap-4">
            <Input
            placeholder={`Filter by ${searchBy}...`}
            value={filterValue}
            onChange={handleFilterChange}
            className="max-w-sm h-9"
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
                    <RadioGroupItem value="material" id="material" />
                    <Label htmlFor="material">Material</Label>
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
            <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
           </Link>
           <Button variant="outline" size="sm" onClick={handleExport}>
              <FileDown className="mr-2 h-4 w-4" /> Export
           </Button>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto">
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
                    <TableHead key={header.id} className="py-2">
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
            {isLoading ? (
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
                    <TableCell key={cell.id} className="py-2">
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
                  No products found. Add your first product!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="py-2">
        <DataTablePagination table={table} />
      </div>
    </div>
    <BarcodeDialog 
        isOpen={isBarcodeDialogOpen}
        onOpenChange={setIsBarcodeDialogOpen}
        item={selectedItemForBarcode}
        shopName={shopName}
    />
    </>
  );
}
