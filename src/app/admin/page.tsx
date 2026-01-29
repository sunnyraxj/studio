
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
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
import { differenceInDays } from 'date-fns';

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


export default function AdminPage() {
  const firestore = useFirestore();

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: usersData, isLoading: isUsersLoading } = useCollection<UserProfile>(usersCollectionRef);

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


  return (
    <div className="flex-1 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>
            Overview of shop subscriptions and system health.
          </CardDescription>
        </CardHeader>
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
    </div>
  );
}
