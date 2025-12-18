
'use client';

import { useState } from 'react';
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
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

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
    if (!user) {
       toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to subscribe.',
      });
      router.push('/login');
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const planDetails = plans.find(p => p.name === selectedPlan);

    try {
        updateDocumentNonBlocking(userDocRef, {
            subscriptionStatus: 'active',
            planName: planDetails?.name,
            planPrice: planDetails?.price,
            subscriptionStartDate: new Date().toISOString(),
        });

      toast({
        title: 'Subscription Successful!',
        description: `You are now subscribed to the ${selectedPlan} plan.`,
      });
      router.push('/owner/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Subscription Failed',
        description: error.message,
      });
    }
  };

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
