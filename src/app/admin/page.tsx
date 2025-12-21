
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
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
import { toast } from '@/hooks/use-toast.tsx';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { add, differenceInDays } from 'date-fns';

type UserProfile = {
  id: string;
  name?: string;
  email?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'pending_verification' | 'rejected';
  role?: 'user' | 'admin';
  utr?: string;
  planPrice?: number;
  rejectionReason?: string;
  planDurationMonths?: number;
  subscriptionEndDate?: string;
  subscriptionStartDate?: string;
  planName?: string;
  subscriptionType?: 'New' | 'Renew';
  shopId?: string;
};

type ExpiringUser = UserProfile & {
    daysRemaining: number;
}

const demoPendingUsers: UserProfile[] = [
    { id: 'user1', name: 'Anjali Verma', email: 'anjali@example.com', subscriptionStatus: 'pending_verification', utr: '348123912381', planPrice: 7499, subscriptionType: 'New', planName: 'Yearly', planDurationMonths: 12 },
    { id: 'user2', name: 'Rajesh Kumar', email: 'rajesh@example.com', subscriptionStatus: 'active', utr: '912837129831', planPrice: 2099, subscriptionType: 'Renew', planName: 'Quarterly', planDurationMonths: 3, subscriptionEndDate: '2024-08-15T12:00:00.000Z' },
];

export default function AdminPage() {
  const firestore = useFirestore();

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: usersData, isLoading: isUsersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const [localPendingUsers, setLocalPendingUsers] = useState(demoPendingUsers);

  const pendingUsers = useMemo(() => {
     if (!firestore) return localPendingUsers;
    return usersData?.filter(u => u.subscriptionStatus === 'pending_verification' || u.subscriptionType === 'Renew');
  }, [usersData, firestore, localPendingUsers]);

  const expiringUsers = useMemo(() => {
    if (!usersData) return [];
    const now = new Date();
    return usersData
        .filter(u => u.subscriptionStatus === 'active' && u.subscriptionEndDate)
        .map(u => {
            const endDate = new Date(u.subscriptionEndDate!);
            const daysRemaining = differenceInDays(endDate, now);
            return { ...u, daysRemaining };
        })
        .filter(u => u.daysRemaining >= 0 && u.daysRemaining < 10)
        .sort((a,b) => a.daysRemaining - b.daysRemaining);
  }, [usersData]);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');

  const handleApprove = async (targetUser: UserProfile) => {
    if (!firestore) { // This implies demo mode
        setLocalPendingUsers(prev => prev.filter(u => u.id !== targetUser.id));
        toast({
            title: 'User Approved (Demo)',
            description: `${targetUser.email} has been granted access.`,
        });
        setIsApproveDialogOpen(false);
        setSelectedUser(null);
        return;
    }
  
    const batch = writeBatch(firestore);
    const targetUserDocRef = doc(firestore, 'users', targetUser.id);
    const durationMonths = targetUser.planDurationMonths || 12;
  
    const updateData: any = {
      subscriptionStatus: 'active',
      subscriptionType: '', // Clear the request type after processing
    };
  
    // For new users, create a new shop
    if (targetUser.subscriptionType === 'New' || !targetUser.shopId) {
      const shopDocRef = doc(collection(firestore, 'shops'));
      batch.set(shopDocRef, {
        id: shopDocRef.id,
        ownerId: targetUser.id,
        name: `${targetUser.name}'s Shop`, // A default name
      });
      updateData.shopId = shopDocRef.id;
      
      // Set start and end date for new subscription
      const startDate = new Date();
      const endDate = add(startDate, { months: durationMonths });
      updateData.subscriptionStartDate = startDate.toISOString();
      updateData.subscriptionEndDate = endDate.toISOString();

    } else if (targetUser.subscriptionType === 'Renew') {
      // For renewals, extend the existing end date
      let startDate = new Date();
      // If the current subscription hasn't expired yet, extend from the end date.
      // Otherwise, start from today.
      if (targetUser.subscriptionEndDate && new Date(targetUser.subscriptionEndDate) > startDate) {
        startDate = new Date(targetUser.subscriptionEndDate);
      }
      const endDate = add(startDate, { months: durationMonths });
      updateData.subscriptionEndDate = endDate.toISOString();
      // No need to change start date for renewals unless it's a lapsed one.
      if (!targetUser.subscriptionEndDate || new Date(targetUser.subscriptionEndDate) <= new Date()) {
         updateData.subscriptionStartDate = new Date().toISOString();
      }
    }
    
    batch.update(targetUserDocRef, updateData);
  
    try {
      await batch.commit();
      toast({
        title: 'User Approved',
        description: `${targetUser.email} has been granted access.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: error.message,
      });
    } finally {
        setIsApproveDialogOpen(false);
        setSelectedUser(null);
    }
  };
  
  const handleReject = async (targetUser: UserProfile) => {
    if (!firestore) { // This implies demo mode
        setLocalPendingUsers(prev => prev.filter(u => u.id !== targetUser.id));
        toast({
            title: 'User Rejected (Demo)',
            description: `${targetUser.email}'s payment has been rejected.`,
        });
        setIsRejectDialogOpen(false);
        setSelectedUser(null);
        setRejectionNote('');
        return;
    }
    
    if (!targetUser || !rejectionNote) {
        toast({
            variant: "destructive",
            title: "Rejection note is required"
        });
        return;
    };

    const batch = writeBatch(firestore);
    
    const targetUserDocRef = doc(firestore, 'users', targetUser.id);

    const updateData: any = {
      rejectionReason: rejectionNote,
      utr: '', // Clear UTR so they must re-enter it
      subscriptionType: '', // Clear the request type
    };
    
    // Only change status if they are not already active
    // This allows active users to continue using the app after a failed renewal
    if(targetUser.subscriptionStatus !== 'active') {
        updateData.subscriptionStatus = 'rejected';
    }


    batch.update(targetUserDocRef, updateData);

    try {
      await batch.commit();
      toast({
        title: 'User Rejected',
        description: `${targetUser.email}'s payment has been rejected.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Rejection Failed',
        description: error.message,
      });
    } finally {
        setIsRejectDialogOpen(false);
        setSelectedUser(null);
        setRejectionNote('');
    }
  };

  const openApproveDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setIsApproveDialogOpen(true);
  };
  
  const openRejectDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setIsRejectDialogOpen(true);
  };


  return (
    <div className="flex-1 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pending Verifications</CardTitle>
          <CardDescription>
            The following users have completed payment and are waiting for account activation or renewal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>UTR</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isUsersLoading && firestore ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading users...</TableCell>
                </TableRow>
              ) : pendingUsers && pendingUsers.length > 0 ? (
                pendingUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name || 'N/A'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>₹{u.planPrice?.toLocaleString('en-IN') || 'N/A'}</TableCell>
                    <TableCell>{u.utr || 'N/A'}</TableCell>
                    <TableCell>
                      {u.subscriptionType === 'Renew' ? (
                        <Badge variant="default">Renew</Badge>
                      ) : (
                        <Badge variant="outline">New</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{u.subscriptionStatus?.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" onClick={() => openApproveDialog(u)}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => openRejectDialog(u)}>Reject</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No pending verifications.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Subscriptions Expiring Soon</CardTitle>
          <CardDescription>
            These users' subscriptions will expire in less than 10 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Days Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isUsersLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading users...</TableCell>
                </TableRow>
              ) : expiringUsers && expiringUsers.length > 0 ? (
                expiringUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name || 'N/A'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.planName || 'N/A'}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">{u.daysRemaining}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No subscriptions are expiring soon.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this user? This will grant them full access to the platform for the selected duration.
              </AlertDialogDescription>
              <div className="mt-4 space-y-2 text-sm text-foreground pt-4">
                  <div><strong>Name:</strong> {selectedUser?.name}</div>
                  <div><strong>Email:</strong> {selectedUser?.email}</div>
                  <div><strong>UTR:</strong> {selectedUser?.utr}</div>
                  <div><strong>Amount:</strong> ₹{selectedUser?.planPrice?.toLocaleString('en-IN')}</div>
                  <div><strong>Type:</strong> <Badge variant={selectedUser?.subscriptionType === 'Renew' ? 'default' : 'outline'}>{selectedUser?.subscriptionType}</Badge></div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => selectedUser && handleApprove(selectedUser)}>
                Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
       </AlertDialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rejection</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payment. This note will be shown to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-1 text-sm">
                <div><strong>Name:</strong> {selectedUser?.name}</div>
                <div><strong>Email:</strong> {selectedUser?.email}</div>
                <div><strong>UTR:</strong> {selectedUser?.utr}</div>
              </div>
            <div className="space-y-2">
              <Label htmlFor="rejection-note">Rejection Note</Label>
              <Textarea 
                id="rejection-note"
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="e.g., UTR not found, incorrect amount paid, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" onClick={() => { setSelectedUser(null); setRejectionNote(''); }}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => selectedUser && handleReject(selectedUser)} disabled={!rejectionNote}>
                Reject Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
