
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type UserProfile = {
  id: string;
  name?: string;
  email?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'pending_verification';
  role?: 'user' | 'admin';
  utr?: string;
  planPrice?: number;
};

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

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleApprove = async (targetUser: UserProfile) => {
    if (!firestore || !targetUser) return;

    const batch = writeBatch(firestore);
    
    // 1. Update the user's profile to active.
    // The user will be redirected to the shop-setup page on their next login.
    const targetUserDocRef = doc(firestore, 'users', targetUser.id);
    batch.update(targetUserDocRef, {
      subscriptionStatus: 'active',
    });

    try {
      await batch.commit();
      toast({
        title: 'User Approved',
        description: `${targetUser.email} has been granted access. They will be prompted to set up their shop on next login.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: error.message,
      });
    } finally {
        setIsDialogOpen(false);
        setSelectedUser(null);
    }
  };

  const openConfirmationDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
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
                <TableHead className="text-right">Action</TableHead>
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
                    <TableCell className="text-right">
                      <Button onClick={() => openConfirmationDialog(u)}>Approve</Button>
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
      
       <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this user? This will grant them full access to the platform.
                 <div className="mt-4 space-y-2 text-sm text-foreground">
                    <div><strong>Name:</strong> {selectedUser?.name}</div>
                    <div><strong>Email:</strong> {selectedUser?.email}</div>
                    <div><strong>UTR:</strong> {selectedUser?.utr}</div>
                    <div><strong>Amount:</strong> ₹{selectedUser?.planPrice?.toLocaleString('en-IN')}</div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => selectedUser && handleApprove(selectedUser)}>
                Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
