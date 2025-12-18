
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';

const proPlan = {
  name: 'Pro',
  price: 799,
  description: 'Full access to all ERP features for your business.',
  features: [
    'Full POS system',
    'Inventory management',
    'Customer database',
    'Sales Analytics',
    'Multi-user support',
    'Priority support',
  ],
};

export default function SubscribePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // If user is not logged in, redirect them to login page.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSubscribe = async () => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to subscribe.',
      });
      return;
    }
    
    // Update user's profile to pending verification
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        subscriptionStatus: 'pending_verification',
        planName: proPlan.name,
        planPrice: proPlan.price,
        subscriptionRequestDate: new Date().toISOString(),
      });

      // Redirect to payment simulation page
      router.push('/payment');
    } catch (error: any) {
      console.error("Subscription update failed:", error);
      toast({
        variant: 'destructive',
        title: 'Subscription Failed',
        description: `Could not update your subscription status. ${error.message}`,
      });
    }
  };
  
  if (isUserLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Subscribe to Pro
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Get started with our all-in-one ERP solution.
        </p>
      </div>
      <div className="max-w-md w-full">
          <Card
            className={cn(
              'flex flex-col transition-all duration-200 border-primary ring-2 ring-primary'
            )}
          >
            <CardHeader>
              <CardTitle>{proPlan.name}</CardTitle>
              <CardDescription>{proPlan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold">₹{proPlan.price}</span>
                <span className="ml-1 text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2">
                {proPlan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
      </div>
      <div className="mt-12 w-full max-w-xs">
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubscribe}
        >
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}
