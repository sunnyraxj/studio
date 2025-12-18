
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

const plans = [
  {
    name: 'Pro',
    price: 799,
    description: 'For small businesses and startups.',
    features: [
      'Full POS system',
      'Inventory management',
      'Customer database',
      'Basic analytics',
    ],
  },
  {
    name: 'Pro Plus',
    price: 1199,
    description: 'For growing businesses with advanced needs.',
    features: [
      'All Pro features',
      'Advanced analytics & reporting',
      'Multi-user support',
      'Priority support',
    ],
  },
];

export default function SubscribePage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // If user is not logged in, redirect them to login page.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      toast({
        variant: 'destructive',
        title: 'No Plan Selected',
        description: 'Please select a subscription plan to continue.',
      });
      return;
    }
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


    const planDetails = plans.find(p => p.name === selectedPlan);
    
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
        planName: planDetails?.name,
        planPrice: planDetails?.price,
        subscriptionStartDate: new Date().toISOString(),
        shopId: shopDocRef.id, // Link user to the new shop
    });

    try {
      await batch.commit();

      toast({
        title: 'Subscription Successful!',
        description: `You are now subscribed to the ${selectedPlan} plan. Your shop has been created.`,
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
          Choose Your Plan
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Select a subscription plan to unlock your dashboard.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              'flex flex-col cursor-pointer transition-all duration-200',
              selectedPlan === plan.name
                ? 'border-primary ring-2 ring-primary'
                : 'hover:border-primary/50'
            )}
            onClick={() => handleSelectPlan(plan.name)}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold">₹{plan.price}</span>
                <span className="ml-1 text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-12 w-full max-w-xs">
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubscribe}
          disabled={!selectedPlan}
        >
          Subscribe Now
        </Button>
      </div>
    </div>
  );
}
