
'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
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
};

export default function AdminPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);

  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user || currentUserProfile?.role !== 'admin') {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to access this page.',
        });
        router.push('/login');
      }
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore || currentUserProfile?.role !== 'admin' ) return null;
    return collection(firestore, 'users');
  }, [firestore, currentUserProfile]);

  const { data: usersData, isLoading: isUsersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const pendingUsers = useMemo(() => {
    return usersData?.filter(u => u.subscriptionStatus === 'pending_verification');
  }, [usersData]);

  const handleApprove = async (targetUser: UserProfile) => {
    if (!firestore) return;

    const batch = writeBatch(firestore);
    
    // 1. Create a new shop document
    const shopDocRef = doc(collection(firestore, 'shops'));
    batch.set(shopDocRef, {
      id: shopDocRef.id,
      ownerId: targetUser.id,
      name: `${targetUser.email?.split('@')[0] || 'My'}'s Shop`,
    });

    // 2. Update the user's profile
    const targetUserDocRef = doc(firestore, 'users', targetUser.id);
    batch.update(targetUserDocRef, {
      subscriptionStatus: 'active',
      shopId: shopDocRef.id,
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
    }
  };

  if (isUserLoading || isProfileLoading || currentUserProfile?.role !== 'admin') {
    return <div className="flex items-center justify-center min-h-screen">Loading Admin Dashboard...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isUsersLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">Loading users...</TableCell>
                </TableRow>
              ) : pendingUsers && pendingUsers.length > 0 ? (
                pendingUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
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
                  <TableCell colSpan={3} className="text-center">No pending verifications.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
