'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
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
import { useMemo, useState } from 'react';
import { useDoc } from '@/firebase/firestore/use-doc';
import { differenceInDays, format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast.tsx';
import { Loader2 } from 'lucide-react';
import { adjustPlanDuration } from './actions';

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

type UserProfile = {
  email?: string;
  subscriptionEndDate?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'pending_verification' | 'rejected';
  planName?: string;
  razorpay_payment_id?: string;
  subscriptionStartDate?: string;
}

type ShopViewModel = Shop & {
  owner?: UserProfile;
  settings?: ShopSettings;
  daysRemaining?: number;
};

function AdjustPlanDialog({ isOpen, onOpenChange, shop, owner }: { isOpen: boolean, onOpenChange: (open: boolean) => void, shop: Shop, owner: UserProfile | null }) {
    const [days, setDays] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const daysNum = parseInt(days, 10);
        if (isNaN(daysNum) || !reason) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please provide a valid number of days and a reason.' });
            setIsSubmitting(false);
            return;
        }

        const result = await adjustPlanDuration(shop.ownerId, daysNum, reason);

        if (result.success) {
            toast({ title: 'Success', description: result.message });
            onOpenChange(false);
            setDays('');
            setReason('');
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message });
        }
        setIsSubmitting(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adjust Plan for {shop.name}</DialogTitle>
                    <DialogDescription>Add or remove days from the user's subscription. Use a negative number to remove days.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="days">Days to Add/Remove</Label>
                        <Input id="days" type="number" placeholder="e.g., 30 or -7" value={days} onChange={e => setDays(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea id="reason" placeholder="e.g., Bonus for loyalty or Penalty for violation" value={reason} onChange={e => setReason(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Apply Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


function ShopRow({ shop }: { shop: Shop }) {
    const firestore = useFirestore();
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [isAdjustOpen, setIsAdjustOpen] = React.useState(false);

    const ownerDocRef = useMemoFirebase(() => {
        if (!firestore || !shop.ownerId) return null;
        return doc(firestore, 'users', shop.ownerId);
    }, [firestore, shop.ownerId]);

    const settingsDocRef = useMemoFirebase(() => {
        if (!firestore || !shop.id) return null;
        return doc(firestore, `shops/${shop.id}/settings`, 'details');
    }, [firestore, shop.id]);

    const { data: owner, isLoading: isOwnerLoading } = useDoc<UserProfile>(ownerDocRef);
    const { data: settings, isLoading: isSettingsLoading } = useDoc<ShopSettings>(settingsDocRef);
    
    const daysRemaining = useMemo(() => {
        if (owner?.subscriptionStatus === 'active' && owner?.subscriptionEndDate) {
            const endDate = new Date(owner.subscriptionEndDate);
            return differenceInDays(endDate, new Date());
        }
        return null;
    }, [owner]);

    const isLoading = isOwnerLoading || isSettingsLoading;

    return (
        <React.Fragment>
            <TableRow>
                 <TableCell>
                     <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-8 w-8"
                        >
                        {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                    </Button>
                </TableCell>
                <TableCell className="font-medium">{shop.name}</TableCell>
                <TableCell>{isLoading ? '...' : owner?.email || 'N/A'}</TableCell>
                <TableCell className="text-muted-foreground">{shop.id}</TableCell>
                <TableCell className="text-right">
                    {isLoading ? '...' : daysRemaining !== null ? (
                        <span className={daysRemaining < 10 ? 'font-bold text-destructive' : ''}>
                           {daysRemaining >= 0 ? `${daysRemaining} days` : 'Expired'}
                        </span>
                    ) : (owner?.subscriptionStatus || 'N/A')}
                </TableCell>
            </TableRow>
            {isExpanded && (
                <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <div className="p-4 bg-muted/50 space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold">Shop Details: {shop.name}</h4>
                        <Button size="sm" variant="outline" onClick={() => setIsAdjustOpen(true)}>Adjust Plan</Button>
                    </div>
                     {isLoading ? (
                         <p>Loading details...</p>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-1 p-3 rounded-md border bg-background">
                                <p className="font-semibold text-muted-foreground">Contact Info</p>
                                <p><strong>Phone:</strong> {settings?.companyPhone || 'N/A'}</p>
                                <p><strong>Address:</strong> {settings?.companyAddress || 'N/A'}</p>
                                <p><strong>GSTIN:</strong> {settings?.companyGstin || 'N/A'}</p>
                            </div>
                             <div className="space-y-1 p-3 rounded-md border bg-background">
                                <p className="font-semibold text-muted-foreground">Bank Details</p>
                                <p><strong>Bank:</strong> {settings?.bankName || 'N/A'}</p>
                                <p><strong>A/C No:</strong> {settings?.accountNumber || 'N/A'}</p>
                                <p><strong>IFSC:</strong> {settings?.ifscCode || 'N/A'}</p>
                            </div>
                            <div className="space-y-1 p-3 rounded-md border bg-background">
                                <p className="font-semibold text-muted-foreground">UPI Details</p>
                                <p><strong>UPI ID:</strong> {settings?.upiId || 'N/A'}</p>
                            </div>
                            <div className="space-y-2 p-3 rounded-md border bg-background md:col-span-3">
                                <p className="font-semibold text-muted-foreground">Subscription Details</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 pt-2">
                                    <p><strong>Plan:</strong> {owner?.planName || 'N/A'}</p>
                                    <p><strong>Status:</strong> <span className="capitalize">{owner?.subscriptionStatus?.replace('_', ' ') || 'N/A'}</span></p>
                                    <p><strong>Start Date:</strong> {owner?.subscriptionStartDate ? format(new Date(owner.subscriptionStartDate), 'dd MMM, yyyy') : 'N/A'}</p>
                                    <p><strong>End Date:</strong> {owner?.subscriptionEndDate ? format(new Date(owner.subscriptionEndDate), 'dd MMM, yyyy') : 'N/A'}</p>
                                    <p className="md:col-span-2"><strong>Payment ID:</strong> {owner?.razorpay_payment_id || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                     )}
                  </div>
                </TableCell>
              </TableRow>
            )}
            <AdjustPlanDialog 
                isOpen={isAdjustOpen} 
                onOpenChange={setIsAdjustOpen}
                shop={shop}
                owner={owner}
            />
        </React.Fragment>
    )
}


export default function AdminShopsPage() {
  const firestore = useFirestore();

  const shopsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'shops');
  }, [firestore]);

  const { data: shopsData, isLoading: isShopsLoading } = useCollection<Shop>(shopsCollectionRef);

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
              <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Shop Name</TableHead>
                  <TableHead>Owner's Email</TableHead>
                  <TableHead>Shop ID</TableHead>
                  <TableHead className="text-right">Subscription Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isShopsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Loading shops...</TableCell>
                </TableRow>
              ) : shopsData?.length ? (
                shopsData.map(shop => <ShopRow key={shop.id} shop={shop} />)
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">No shops found.</TableCell>
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
