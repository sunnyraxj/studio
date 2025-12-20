
'use client';

import { useEffect, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, getDoc } from 'firebase/firestore';
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
    getExpandedRowModel,
    useReactTable,
    ExpandedState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import * as React from 'react';

type Shop = {
  id: string;
  name: string;
  ownerId: string;
};

type ShopSettings = {
    companyAddress?: string;
    companyGstin?: string;
    companyPhone?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
};

type ShopViewModel = Shop & {
  ownerEmail?: string;
  settings?: ShopSettings;
};

type UserProfile = {
  email?: string;
}

const columns: ColumnDef<ShopViewModel>[] = [
    {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => {
        return row.getCanExpand() ? (
            <Button
            variant="ghost"
            size="icon"
            onClick={row.getToggleExpandedHandler()}
            className="h-8 w-8"
            >
            {row.getIsExpanded() ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </Button>
        ) : null;
        },
  },
  {
    accessorKey: 'name',
    header: 'Shop Name',
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'ownerEmail',
    header: "Owner's Email",
  },
   {
    accessorKey: 'id',
    header: 'Shop ID',
    cell: ({ row }) => <div className="text-muted-foreground">{row.getValue('id')}</div>,
  },
];


export default function AdminShopsPage() {
  const firestore = useFirestore();

  const shopsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'shops');
  }, [firestore]);

  const { data: shopsData, isLoading: isShopsLoading } = useCollection<Shop>(shopsCollectionRef);
  const [shops, setShops] = useState<ShopViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  useEffect(() => {
    if (isShopsLoading || !shopsData || !firestore) {
        if (!isShopsLoading) {
            setIsLoading(false);
        }
        return;
    };

    const fetchShopDetails = async () => {
        setIsLoading(true);
        const shopsWithDetails = await Promise.all(
            shopsData.map(async (shop) => {
                let ownerEmail = 'N/A';
                let settings: ShopSettings | undefined = undefined;

                try {
                    // Fetch owner email
                    if (shop.ownerId) {
                        const userDocRef = doc(firestore, 'users', shop.ownerId);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                           const userData = userDocSnap.data() as UserProfile;
                           ownerEmail = userData.email || 'N/A';
                        }
                    }
                    // Fetch shop settings
                    const settingsDocRef = doc(firestore, `shops/${shop.id}/settings`, 'details');
                    const settingsDocSnap = await getDoc(settingsDocRef);
                    if (settingsDocSnap.exists()) {
                        settings = settingsDocSnap.data() as ShopSettings;
                    }

                } catch (error) {
                    console.error(`Failed to fetch details for shop ${shop.id}`, error);
                }
                return { ...shop, ownerEmail, settings };
            })
        );
        setShops(shopsWithDetails);
        setIsLoading(false);
    };

    fetchShopDetails();

  }, [shopsData, isShopsLoading, firestore]);

  const table = useReactTable({
    data: shops,
    columns,
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="flex-1 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Registered Shops</CardTitle>
          <CardDescription>
            A list of all shops that have subscribed to the service. Click to expand for details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">Loading shops...</TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
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
                        <TableCell colSpan={columns.length} className="p-0">
                          <div className="p-4 bg-muted/50 space-y-4">
                            <h4 className="font-bold">Shop Details: {row.original.name}</h4>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="space-y-1 p-3 rounded-md border bg-background">
                                    <p className="font-semibold text-muted-foreground">Contact Info</p>
                                    <p><strong>Phone:</strong> {row.original.settings?.companyPhone || 'N/A'}</p>
                                    <p><strong>Address:</strong> {row.original.settings?.companyAddress || 'N/A'}</p>
                                    <p><strong>GSTIN:</strong> {row.original.settings?.companyGstin || 'N/A'}</p>
                                </div>
                                 <div className="space-y-1 p-3 rounded-md border bg-background">
                                    <p className="font-semibold text-muted-foreground">Bank Details</p>
                                    <p><strong>Bank:</strong> {row.original.settings?.bankName || 'N/A'}</p>
                                    <p><strong>A/C No:</strong> {row.original.settings?.accountNumber || 'N/A'}</p>
                                    <p><strong>IFSC:</strong> {row.original.settings?.ifscCode || 'N/A'}</p>
                                </div>
                                <div className="space-y-1 p-3 rounded-md border bg-background">
                                    <p className="font-semibold text-muted-foreground">UPI Details</p>
                                    <p><strong>UPI ID:</strong> {row.original.settings?.upiId || 'N/A'}</p>
                                </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">No shops found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
