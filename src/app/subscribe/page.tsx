
'use client';

import { useState, useEffect } from 'react';
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
import { doc, writeBatch, collection, getDoc } from 'firebase/firestore';
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

    // Check if the user already has a shop to prevent creating a new one
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists() && userDoc.data()?.shopId) {
        toast({
            variant: "destructive",
            title: "Already Subscribed",
            description: "You already have an active shop. Redirecting you to the dashboard."
        });
        router.push('/dashboard');
        return;
    }
    
    // Create a batch write to perform multiple operations atomically
    const batch = writeBatch(firestore);

    // 1. Create a new shop document
    const shopDocRef = doc(collection(firestore, 'shops'));
    batch.set(shopDocRef, {
      id: shopDocRef.id,
      ownerId: user.uid,
      name: `${user.email?.split('@')[0] || 'My'}'s Shop`, // Default shop name
    });

    // 2. Update the user's profile with subscription and shop info
    batch.update(userDocRef, {
        subscriptionStatus: 'active',
        planName: proPlan.name,
        planPrice: proPlan.price,
        subscriptionStartDate: new Date().toISOString(),
        shopId: shopDocRef.id, // Link user to the new shop
    });

    try {
      await batch.commit();

      toast({
        title: 'Subscription Successful!',
        description: `You are now subscribed to the ${proPlan.name} plan. Your shop has been created.`,
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Subscription and shop creation failed:", error);
      toast({
        variant: 'destructive',
        title: 'Subscription Failed',
        description: `Could not create your shop. ${error.message}`,
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
          Subscribe Now
        </Button>
      </div>
    </div>
  );
}

