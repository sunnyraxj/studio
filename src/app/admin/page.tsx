
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
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

type UserProfile = {
  id: string;
  email?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'pending_verification';
  role?: 'user' | 'admin';
  utr?: string;
};

export default function AdminPage() {
  const router = useRouter();
  const firestore = useFirestore();

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: usersData, isLoading: isUsersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const pendingUsers = useMemo(() => {
    return usersData?.filter(u => u.subscriptionStatus === 'pending_verification');
  }, [usersData]);

  const handleApprove = async (targetUser: UserProfile) => {
    if (!firestore) return;

    const batch = writeBatch(firestore);
    
    // 1. Update the user's profile to active, but DO NOT create the shop yet.
    // The shop will be created after the user completes the shop-setup flow.
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
    }
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
                <TableHead>Email</TableHead>
                <TableHead>UTR</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isUsersLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading users...</TableCell>
                </TableRow>
              ) : pendingUsers && pendingUsers.length > 0 ? (
                pendingUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.utr || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{u.subscriptionStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button onClick={() => handleApprove(u)}>Approve</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No pending verifications.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
