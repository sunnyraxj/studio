
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
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';

const plans = [
  {
    name: 'Monthly',
    price: 799,
    durationMonths: 1,
    description: 'Perfect for getting started.',
    features: [
      'Full POS system',
      'Inventory management',
      'Customer database',
    ],
  },
  {
    name: 'Quarterly',
    price: 2099,
    durationMonths: 3,
    description: 'A popular choice for growing businesses.',
    features: [
      'Full POS system',
      'Inventory management',
      'Customer database',
      'Sales Analytics',
    ],
    highlight: true,
  },
  {
    name: 'Half-Yearly',
    price: 3999,
    durationMonths: 6,
    description: 'Save more with a longer commitment.',
    features: [
      'Full POS system',
      'Inventory management',
      'Customer database',
      'Sales Analytics',
      'Multi-user support',
    ],
  },
  {
    name: 'Yearly',
    price: 7499,
    durationMonths: 12,
    description: 'Best value for established businesses.',
    features: [
      'Full POS system',
      'Inventory management',
      'Customer database',
      'Sales Analytics',
      'Multi-user support',
      'Priority support',
    ],
  },
];


export default function SubscribePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState(plans.find(p => p.highlight));

  // If user is not logged in, redirect them to login page.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSubscribe = async () => {
    if (!user || !firestore || !selectedPlan) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated or No Plan Selected',
        description: 'You must be logged in and select a plan to subscribe.',
      });
      return;
    }
    
    // Update user's profile to pending verification
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        subscriptionStatus: 'pending_verification',
        planName: selectedPlan.name,
        planPrice: selectedPlan.price,
        planDurationMonths: selectedPlan.durationMonths, // Store duration
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
          Choose the plan that's right for your business.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full">
         {plans.map(plan => (
            <Card
                key={plan.name}
                onClick={() => setSelectedPlan(plan)}
                className={cn(
                    'flex flex-col cursor-pointer transition-all duration-200',
                    selectedPlan?.name === plan.name ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'
                )}
            >
                {plan.highlight && (
                    <div className="text-center py-1 bg-primary text-primary-foreground text-sm font-semibold rounded-t-lg">
                        Most Popular
                    </div>
                )}
                <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                <div className="flex items-baseline">
                    <span className="text-4xl font-bold">₹{plan.price.toLocaleString('en-IN')}</span>
                     <span className="ml-1 text-muted-foreground">/{plan.durationMonths === 1 ? 'month' : `${plan.durationMonths} months`}</span>
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
          className="w-full shadow-lg shadow-yellow-500/50"
          size="lg"
          onClick={handleSubscribe}
          disabled={!selectedPlan}
        >
          {selectedPlan ? `Pay ₹${selectedPlan.price.toLocaleString('en-IN')}` : 'Select a Plan'}
        </Button>
      </div>
    </div>
  );
}
