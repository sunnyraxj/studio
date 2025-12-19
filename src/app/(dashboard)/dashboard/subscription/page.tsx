
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { format, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type UserProfile = {
  subscriptionStatus?: 'active' | 'inactive' | 'pending_verification' | 'rejected';
  planName?: string;
  planPrice?: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
};

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  const isDemoMode = !user;

  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number>(365);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (userData?.subscriptionStatus === 'active' && userData.subscriptionStartDate && userData.subscriptionEndDate) {
      const startDate = new Date(userData.subscriptionStartDate);
      const endDate = new Date(userData.subscriptionEndDate);
      const now = new Date();
      
      const remaining = differenceInDays(endDate, now);
      const total = differenceInDays(endDate, startDate);

      setDaysRemaining(remaining > 0 ? remaining : 0);
      setTotalDuration(total > 0 ? total : 1);

      if (total > 0) {
        const elapsed = differenceInDays(now, startDate);
        const progressPercentage = Math.max(0, Math.min(100, (elapsed / total) * 100));
        setProgress(progressPercentage);
      } else {
        setProgress(100);
      }
    }
  }, [userData]);

  const handleRenew = () => {
    router.push('/subscribe');
  };

  const getStatusInfo = () => {
    switch (userData?.subscriptionStatus) {
      case 'active':
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-500" />,
          title: 'Subscription Active',
          description: 'You have full access to all features.',
          badgeVariant: 'default',
        };
      case 'pending_verification':
        return {
          icon: <Clock className="h-6 w-6 text-yellow-500" />,
          title: 'Verification Pending',
          description: 'Your payment is being verified. This may take a few hours.',
          badgeVariant: 'secondary',
        };
      case 'rejected':
         return {
          icon: <XCircle className="h-6 w-6 text-red-500" />,
          title: 'Payment Rejected',
          description: 'Your recent payment was not successful. Please try again.',
          badgeVariant: 'destructive',
        };
      case 'inactive':
      default:
        return {
          icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
          title: 'No Active Subscription',
          description: 'Subscribe to a plan to unlock all features.',
          badgeVariant: 'destructive',
        };
    }
  };
  
  const statusInfo = getStatusInfo();

  const isLoading = isUserLoading || isProfileLoading;

  if (isDemoMode) {
      return (
         <div className="flex-1 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Subscription</h2>
            <Card>
                <CardHeader>
                    <CardTitle>Demo Mode</CardTitle>
                    <CardDescription>
                        This is a demo version. Please log in and subscribe to manage your subscription.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">You can explore the app's features in demo mode. To get your own dedicated shop and save data, you'll need to create an account and subscribe.</p>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => router.push('/login')}>Login or Sign Up</Button>
                </CardFooter>
            </Card>
        </div>
      )
  }
  
  return (
    <div className="flex-1 space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">My Subscription</h2>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
              <div>
                <CardTitle>Plan Details</CardTitle>
                <CardDescription>View your current subscription status and details.</CardDescription>
              </div>
               {isLoading ? <Skeleton className="h-6 w-24 rounded-full" /> : <Badge variant={statusInfo.badgeVariant} className="capitalize">{userData?.subscriptionStatus?.replace('_', ' ')}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
            <div className="flex items-center space-x-4 rounded-md border p-4">
                {isLoading ? <Skeleton className="h-8 w-8" /> : statusInfo.icon}
                <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium leading-none">
                        {isLoading ? <Skeleton className="h-5 w-32" /> : statusInfo.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {isLoading ? <Skeleton className="h-4 w-64" /> : statusInfo.description}
                    </div>
                </div>
            </div>

            {userData?.subscriptionStatus === 'active' && (
                 <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <dt className="text-muted-foreground">Plan</dt>
                            <dd className="font-medium">{isLoading ? <Skeleton className="h-5 w-20" /> : userData.planName || 'Pro'}</dd>
                        </div>
                        <div className="space-y-1 text-right">
                            <dt className="text-muted-foreground">Price</dt>
                            <dd className="font-medium">{isLoading ? <Skeleton className="h-5 w-24" /> : `₹${userData.planPrice || 0}/year`}</dd>
                        </div>
                        <div className="space-y-1">
                            <dt className="text-muted-foreground">Start Date</dt>
                            <dd className="font-medium">{isLoading ? <Skeleton className="h-5 w-28" /> : userData.subscriptionStartDate ? format(new Date(userData.subscriptionStartDate), 'dd MMM, yyyy') : 'N/A'}</dd>
                        </div>
                        <div className="space-y-1 text-right">
                            <dt className="text-muted-foreground">End Date</dt>
                            <dd className="font-medium">{isLoading ? <Skeleton className="h-5 w-28" /> : userData.subscriptionEndDate ? format(new Date(userData.subscriptionEndDate), 'dd MMM, yyyy') : 'N/A'}</dd>
                        </div>
                    </div>
                     <div>
                        <Progress value={progress} className="w-full" indicatorClassName={daysRemaining !== null && daysRemaining < 30 ? 'bg-destructive' : 'bg-primary'} />
                        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                            {isLoading ? <Skeleton className="h-4 w-24" /> : <span>{totalDuration - (daysRemaining ?? 0)} days used</span>}
                            {isLoading ? <Skeleton className="h-4 w-24" /> : 
                                (daysRemaining !== null && daysRemaining > 0) ? (
                                    <span className={daysRemaining < 30 ? 'font-bold text-destructive' : ''}>
                                        {daysRemaining} days remaining
                                    </span>
                                ) : <span>Expired</span>
                            }
                        </div>
                    </div>
                 </div>
            )}
        </CardContent>
        <CardFooter>
            <Button onClick={handleRenew} disabled={isLoading || (daysRemaining !== null && daysRemaining > 30)}>
                {userData?.subscriptionStatus === 'rejected' || userData?.subscriptionStatus === 'inactive' ? 'Subscribe Now' : 'Renew Subscription'}
            </Button>
            {daysRemaining !== null && daysRemaining > 30 && (
                <p className="text-sm text-muted-foreground ml-4">
                    You can renew your subscription within 30 days of expiry.
                </p>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
