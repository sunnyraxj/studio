
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
} from '@tanstack/react-table';
import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

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
import { PlusCircle, FileUp, FileDown } from 'lucide-react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const data: InventoryItem[] = [
  {
    id: 'm5gr84i9',
    name: "Men's Cotton T-Shirt",
    status: 'in stock',
    sku: 'TSHIRT-BLK-L',
    stock: 120,
    price: 499,
    category: 'Apparel',
    size: 'L',
    gst: 5,
    hsn: '610910',
    unit: 'pcs',
    dateAdded: new Date('2023-10-15'),
  },
  {
    id: '3u1reuv4',
    name: 'Blue Denim Jeans',
    status: 'in stock',
    sku: 'JEANS-BLU-32',
    stock: 80,
    price: 1299,
    category: 'Apparel',
    size: '32',
    gst: 5,
    hsn: '620342',
    unit: 'pcs',
    dateAdded: new Date('2023-09-20'),
  },
  {
    id: 'derv1ws0',
    name: 'White Sneakers',
    status: 'low stock',
    sku: 'SNEAK-WHT-10',
    stock: 15,
    price: 2499,
    category: 'Footwear',
    size: '10',
    gst: 18,
    hsn: '640411',
    unit: 'pair',
    dateAdded: new Date('2023-11-01'),
  },
  {
    id: '5kma53ae',
    name: 'Leather Strap Watch',
    status: 'in stock',
    sku: 'WATCH-SIL-01',
    stock: 45,
    price: 3500,
    category: 'Accessories',
    size: 'N/A',
    gst: 18,
    hsn: '910211',
    unit: 'pcs',
    dateAdded: new Date('2023-08-05'),
  },
  {
    id: 'bhqecj4p',
    name: 'Red Baseball Cap',
    status: 'out of stock',
    sku: 'CAP-RED-OS',
    stock: 0,
    price: 399,
    category: 'Accessories',
    size: 'One Size',
    gst: 12,
    hsn: '650500',
    unit: 'pcs',
    dateAdded: new Date('2023-10-25'),
  },
];

export type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  status: 'in stock' | 'low stock' | 'out of stock';
  dateAdded: Date;
  category: string;
  size: string;
  gst: number;
  hsn: string;
  unit: string;
};

export const columns: ColumnDef<InventoryItem>[] = [
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
            <DropdownMenuItem>Edit product</DropdownMenuItem>
            <DropdownMenuItem>Print barcode</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function InventoryPage() {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'dateAdded', desc: true }
  ]);
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
        hsn: false,
        sku: false,
    });
  const [rowSelection, setRowSelection] = React.useState({});
  const [searchBy, setSearchBy] = React.useState('name');
  const [filterValue, setFilterValue] = React.useState('');

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilterValue(value);
    table.getColumn(searchBy)?.setFilterValue(value);
  };

  const handleSearchByChange = (value: string) => {
    // Clear previous filter
    table.getColumn(searchBy)?.setFilterValue('');

    setSearchBy(value);
    // Apply current filter value to new column
    if (filterValue) {
      table.getColumn(value)?.setFilterValue(filterValue);
    }
  };


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
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" /> Download Template
            </Button>
            <Button variant="outline">
              <FileUp className="mr-2 h-4 w-4" /> Import Products
            </Button>
           <Link href="/owner/inventory/add">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
           </Link>
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
                        {column.id === 'dateAdded' ? 'Date Added' : column.id}
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
            {table.getRowModel().rows?.length ? (
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
                  No results.
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
