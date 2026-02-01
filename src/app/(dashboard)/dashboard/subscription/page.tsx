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
import { format, differenceInMilliseconds, differenceInDays, differenceInHours } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Clock, XCircle, AlertTriangle, Gift, ShieldAlert, IndianRupee } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type UserProfile = {
  subscriptionStatus?: 'active' | 'inactive' | 'pending_verification' | 'rejected';
  planName?: string;
  planPrice?: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionType?: 'New' | 'Renew';
  rejectionReason?: string;
  planDurationValue?: number;
  planDurationType?: 'hours' | 'days' | 'months' | 'years';
  lastAdjustment?: {
      days: number;
      reason: string;
      date: string;
  };
};

type TimeRemaining = {
    days: number;
    hours: number;
    minutes: number;
}

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

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [progress, setProgress] = useState(0);
  const [canRenew, setCanRenew] = useState(false);
  const [adjustmentNotification, setAdjustmentNotification] = useState<{days: number; reason: string; type: 'bonus' | 'penalty'} | null>(null);

  useEffect(() => {
    if (userData?.lastAdjustment) {
      const adjustmentDate = new Date(userData.lastAdjustment.date);
      const now = new Date();
      const hoursSinceAdjustment = differenceInHours(now, adjustmentDate);

      if (hoursSinceAdjustment < 24) {
        const days = userData.lastAdjustment.days;
        const reason = userData.lastAdjustment.reason;
        setAdjustmentNotification({
            days,
            reason,
            type: days > 0 ? 'bonus' : 'penalty'
        });
      }
    }
  }, [userData]);

  useEffect(() => {
    if (userData?.subscriptionStatus === 'active' && userData.subscriptionStartDate && userData.subscriptionEndDate) {
      const startDate = new Date(userData.subscriptionStartDate);
      const endDate = new Date(userData.subscriptionEndDate);
      
      const updateRemainingTime = () => {
        const now = new Date();
        const diff = differenceInMilliseconds(endDate, now);

        if (diff <= 0) {
            setTimeRemaining({ days: 0, hours: 0, minutes: 0 });
            setProgress(100);
            setCanRenew(true);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        
        setTimeRemaining({ days, hours, minutes });

        const totalDuration = differenceInMilliseconds(endDate, startDate);
        let progressPercentage = 0;
        if (totalDuration > 0) {
            const elapsed = differenceInMilliseconds(now, startDate);
            progressPercentage = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
            setProgress(progressPercentage);
        } else {
            progressPercentage = 100;
            setProgress(100);
        }
        
        setCanRenew(progressPercentage >= 50);
      };

      updateRemainingTime();
      const interval = setInterval(updateRemainingTime, 60000); // Update every minute
      return () => clearInterval(interval);
    } else {
        // Handle non-active states
        if (userData?.subscriptionStatus === 'inactive' || userData?.subscriptionStatus === 'rejected') {
            setCanRenew(true);
        }
    }
  }, [userData]);

  const handleRenew = () => {
    router.push('/subscribe');
  };

  const getStatusInfo = () => {
    // A renewal might be pending for an active (but expiring) user.
    if (userData?.subscriptionType === 'Renew' && userData?.subscriptionStatus === 'active') {
        return {
          icon: <Clock className="h-6 w-6 text-yellow-500" />,
          title: 'Renewal Pending Verification',
          description: 'Your renewal payment is being verified. Your current plan remains active until its expiry.',
          badgeVariant: 'secondary',
        }
    }
    
    // A renewal might be pending for an already inactive user.
    if (userData?.subscriptionType === 'Renew' && userData?.subscriptionStatus === 'pending_verification') {
        return {
          icon: <Clock className="h-6 w-6 text-yellow-500" />,
          title: 'Renewal Pending Verification',
          description: 'Your renewal payment is being verified. Your access will be restored upon approval.',
          badgeVariant: 'secondary',
        }
    }

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
          description: userData.rejectionReason ? `Reason: ${userData.rejectionReason}` : 'Your recent payment was not successful. Please try again.',
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
  
  const isRenewalPending = userData?.subscriptionType === 'Renew';

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
            {adjustmentNotification && (
                <Card className={cn('shadow-none', adjustmentNotification.type === 'bonus' ? 'bg-green-500/10 border-green-500' : 'bg-destructive/10 border-destructive')}>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className={cn('p-2 rounded-full', adjustmentNotification.type === 'bonus' ? 'bg-green-500/20 text-green-700' : 'bg-destructive/20 text-destructive')}>
                            {adjustmentNotification.type === 'bonus' ? <Gift className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                        </div>
                        <div className='flex-grow'>
                            <p className="font-semibold text-sm">
                                {adjustmentNotification.type === 'bonus' ? 'Plan Extended by Admin' : 'Plan Reduced by Admin'}
                            </p>
                            <p className='text-xs text-muted-foreground'>
                                Reason: {adjustmentNotification.reason}
                            </p>
                        </div>
                        <div className={cn('text-lg font-bold', adjustmentNotification.type === 'bonus' ? 'text-green-700' : 'text-destructive')}>
                            {adjustmentNotification.days > 0 ? `+${adjustmentNotification.days}` : adjustmentNotification.days} Days
                        </div>
                    </CardContent>
                </Card>
            )}

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

            {(userData?.subscriptionStatus === 'active' || (userData?.subscriptionStatus === 'inactive' && userData?.planName)) && (
                <div className="space-y-6 rounded-md border p-6">
                    <div className="grid grid-cols-1 gap-y-4 text-sm md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Current Plan</p>
                            {isLoading ? <Skeleton className="h-6 w-24" /> : <p className="text-lg font-bold">{userData.planName || 'N/A'}</p>}
                        </div>
                        <div className="space-y-1">
                             <p className="text-xs text-muted-foreground">Price</p>
                            {isLoading ? <Skeleton className="h-6 w-20" /> : <p className="text-lg font-bold flex items-center"><IndianRupee className="h-5 w-5 mr-1" />{userData.planPrice?.toLocaleString('en-IN') || 0}</p>}
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Activation Date</p>
                            {isLoading ? <Skeleton className="h-5 w-24" /> : <p className="font-medium">{userData.subscriptionStartDate ? format(new Date(userData.subscriptionStartDate), 'dd MMM, yyyy') : 'N/A'}</p>}
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Expiry Date</p>
                            {isLoading ? <Skeleton className="h-5 w-24" /> : <p className="font-medium">{userData.subscriptionEndDate ? format(new Date(userData.subscriptionEndDate), 'dd MMM, yyyy') : 'N/A'}</p>}
                        </div>
                    </div>
                    
                     <div className="pt-2">
                        <Progress value={progress} className="w-full" indicatorClassName={timeRemaining?.days !== null && timeRemaining?.days < 30 ? 'bg-destructive' : 'bg-primary'} />
                        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                            {isLoading || !timeRemaining ? <Skeleton className="h-4 w-48" /> : 
                                timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes === 0 ?
                                <span>Plan expired</span> :
                                <span>Time used ({progress.toFixed(0)}%)</span>
                            }
                            {isLoading || !timeRemaining ? <Skeleton className="h-4 w-48" /> : 
                                (timeRemaining.days > 0 || timeRemaining.hours > 0 || timeRemaining.minutes > 0) ? (
                                    <span className={timeRemaining.days < 30 ? 'font-bold text-destructive' : ''}>
                                        {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m remaining
                                    </span>
                                ) : userData?.subscriptionStatus === 'active' ? <span>Expired</span> : null
                            }
                        </div>
                    </div>
                 </div>
            )}
        </CardContent>
        <CardFooter>
            <Button onClick={handleRenew} disabled={isLoading || !canRenew || isRenewalPending}>
                {userData?.subscriptionStatus === 'active' ? 'Renew Subscription' : 'Subscribe Now'}
            </Button>
            {isRenewalPending ? (
                <div className="text-sm text-muted-foreground ml-4">
                   Your renewal is pending verification.
                </div>
            ) : !canRenew && userData?.subscriptionStatus === 'active' && (
                <div className="text-sm text-muted-foreground ml-4">
                   You can renew your plan once 50% of it has been used.
                </div>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
