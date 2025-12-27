
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
import { Check, BadgePercent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, collection, query, orderBy } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';
import { Skeleton } from '@/components/ui/skeleton';

type Plan = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  durationMonths: number;
  description: string;
  features: string[];
  highlight: boolean;
  order: number;
};

type UserProfile = {
  subscriptionStatus?: 'active' | 'inactive' | 'pending_verification' | 'rejected';
}


export default function SubscribePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'global/plans/all'), orderBy('order'));
  }, [firestore]);

  const { data: plans, isLoading: isPlansLoading } = useCollection<Plan>(plansQuery);

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Set default selected plan
  useEffect(() => {
    if (plans) {
      setSelectedPlan(plans.find(p => p.highlight) || plans[0] || null);
    }
  }, [plans]);

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      toast({
        variant: 'destructive',
        title: 'No Plan Selected',
        description: 'Please select a plan to continue.',
      });
      return;
    }
    
    // If user is not logged in, redirect to login page.
    if (!user) {
        // We can pass the selected plan ID to the login page to remember the choice after login
        router.push(`/login?redirect=/subscribe&planId=${selectedPlan.id}`);
        return;
    }
    
    const hasSubscription = userData?.subscriptionStatus && userData.subscriptionStatus !== 'inactive';
    const subscriptionType = hasSubscription ? 'Renew' : 'New';

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      
      const updateData: any = {
        planName: selectedPlan.name,
        planPrice: selectedPlan.price,
        planDurationMonths: selectedPlan.durationMonths,
        subscriptionRequestDate: new Date().toISOString(),
        subscriptionType: subscriptionType,
      };

      // Only move to pending verification if they are not already an active user renewing.
      if (userData?.subscriptionStatus !== 'active') {
        updateData.subscriptionStatus = 'pending_verification';
      }

      await updateDoc(userDocRef, updateData);

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
  
  const isLoading = isUserLoading || isProfileLoading || isPlansLoading;

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
         {isLoading ? (
             Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-8 w-1/2" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </CardContent>
                </Card>
             ))
         ) : plans?.map(plan => {
            const perMonthCost = plan.durationMonths > 1 && plan.durationMonths < 100 ? plan.price / plan.durationMonths : plan.price;

            return (
                <Card
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={cn(
                        'flex flex-col cursor-pointer transition-all duration-200 relative overflow-hidden',
                        selectedPlan?.id === plan.id ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'
                    )}
                >
                    {plan.highlight && (
                        <div className="text-center py-1 bg-primary text-primary-foreground text-sm font-semibold">
                            Most Popular
                        </div>
                    )}
                     {plan.originalPrice && plan.originalPrice > plan.price && (
                        <div className="absolute top-0 right-0 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
                            <BadgePercent className="h-3 w-3"/>
                            Save {Math.round(100 - (plan.price / plan.originalPrice) * 100)}%
                        </div>
                    )}
                    <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">₹{plan.price.toLocaleString('en-IN')}</span>
                        {plan.originalPrice && plan.originalPrice > plan.price && (
                             <span className="text-lg font-medium text-muted-foreground line-through">₹{plan.originalPrice.toLocaleString('en-IN')}</span>
                        )}
                    </div>
                     {plan.durationMonths > 1 && plan.durationMonths < 100 && (
                         <div className="text-sm text-muted-foreground">
                            (Just ₹{Math.round(perMonthCost).toLocaleString('en-IN')}/month)
                         </div>
                     )}
                    <ul className="space-y-2 pt-4">
                        {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center text-sm">
                            <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                        </li>
                        ))}
                    </ul>
                    </CardContent>
                </Card>
            )
         })}
      </div>
      <div className="mt-12 w-full max-w-xs">
        <Button
          className="w-full shadow-lg shadow-primary/50 sparkle"
          size="lg"
          onClick={handleSubscribe}
          disabled={!selectedPlan || isPlansLoading}
        >
          {selectedPlan ? `Pay ₹${selectedPlan.price.toLocaleString('en-IN')}` : 'Select a Plan'}
        </Button>
      </div>
    </div>
  );
}
