
'use client';

import { useEffect, useState } from 'react';
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
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';

type UserProfile = {
  subscriptionStatus?: 'active' | 'inactive' | 'pending_verification';
  planName?: string;
  planPrice?: number;
};

export default function PaymentPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    // In a real app, you would integrate a payment gateway here.
    // For now, we'll just simulate a successful payment.
    
    // The user's status is already 'pending_verification' from the subscribe page.
    // We don't need to change it here.

    toast({
      title: 'Payment Submitted',
      description: 'Your payment is being processed and is now pending verification from an admin.',
    });

    // Redirect to a page that informs the user to wait for verification
    router.push('/pending-verification');
  };

  if (isUserLoading || isProfileLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading Payment Details...</div>;
  }

  if (userData?.subscriptionStatus === 'active') {
     router.push('/dashboard');
     return null;
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <CardDescription>
            Review your plan details and proceed with the payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center border rounded-md p-4">
            <span className="font-medium">{userData?.planName || 'Pro Plan'}</span>
            <span className="font-bold text-lg">₹{userData?.planPrice || 799}/month</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This is a simulated payment process. Clicking the button below will mark your payment as submitted and notify an administrator for verification.
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleSimulatePayment} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Simulate Payment'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
