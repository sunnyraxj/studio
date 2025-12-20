
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
  planName?: string;
};

type ExpiringUser = UserProfile & {
    daysRemaining: number;
}

export default function AdminPage() {
  const firestore = useFirestore();

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: usersData, isLoading: isUsersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const pendingUsers = useMemo(() => {
    return usersData?.filter(u => u.subscriptionStatus === 'pending_verification');
  }, [usersData]);

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
    if (!firestore || !targetUser) return;

    const batch = writeBatch(firestore);
    
    const targetUserDocRef = doc(firestore, 'users', targetUser.id);
    const startDate = new Date();
    // Use planDurationMonths to calculate end date, default to 12 months if not present
    const durationMonths = targetUser.planDurationMonths || 12;
    const endDate = add(startDate, { months: durationMonths });

    batch.update(targetUserDocRef, {
      subscriptionStatus: 'active',
      subscriptionStartDate: startDate.toISOString(),
      subscriptionEndDate: endDate.toISOString(),
    });

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
    if (!firestore || !targetUser || !rejectionNote) {
        toast({
            variant: "destructive",
            title: "Rejection note is required"
        });
        return;
    };

    const batch = writeBatch(firestore);
    
    const targetUserDocRef = doc(firestore, 'users', targetUser.id);
    batch.update(targetUserDocRef, {
      subscriptionStatus: 'rejected',
      rejectionReason: rejectionNote,
      utr: '', // Clear UTR so they must re-enter it
    });

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
            The following users have completed payment and are waiting for account activation.
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isUsersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading users...</TableCell>
                </TableRow>
              ) : pendingUsers && pendingUsers.length > 0 ? (
                pendingUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name || 'N/A'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>₹{u.planPrice?.toLocaleString('en-IN') || 'N/A'}</TableCell>
                    <TableCell>{u.utr || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{u.subscriptionStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" onClick={() => openApproveDialog(u)}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => openRejectDialog(u)}>Reject</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No pending verifications.</TableCell>
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
