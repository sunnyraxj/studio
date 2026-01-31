
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
import { Check, BadgePercent, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';
import { Skeleton } from '@/components/ui/skeleton';

declare global {
    interface Window {
        Razorpay: any;
    }
}

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
  razorpayPlanId?: string;
};

type UserProfile = {
  name?: string;
  email?: string;
  phone?: string;
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
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (plans) {
      setSelectedPlan(plans.find(p => p.highlight) || plans[0] || null);
    }
  }, [plans]);

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      toast({ variant: 'destructive', title: 'No Plan Selected' });
      return;
    }

    if (!user || !userData) {
      router.push(`/login?redirect=/subscribe&planId=${selectedPlan.id}`);
      return;
    }

    if (!selectedPlan.razorpayPlanId) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'This plan is not configured for payments. Please contact admin.'});
        return;
    }
    
    setIsProcessing(true);

    try {
      // 1. Create a subscription on your backend
      const createSubResponse = await fetch('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan.razorpayPlanId }),
      });

      if (!createSubResponse.ok) {
        throw new Error('Failed to create subscription on server.');
      }
      const { subscriptionId } = await createSubResponse.json();

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: subscriptionId,
        name: 'Axom Billing',
        description: `Subscribing to ${selectedPlan.name}`,
        handler: async function (response: any) {
          // 3. Verify payment on your backend
          const verifyResponse = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              userId: user.uid,
              plan: selectedPlan,
            }),
          });
          
          if (!verifyResponse.ok) {
            throw new Error('Payment verification failed.');
          }
          
          toast({ title: 'Payment Successful!', description: 'Your subscription is being activated. Please wait...' });
          router.push('/pending-verification');
        },
        prefill: {
          name: userData.name || '',
          email: userData.email || '',
          contact: userData.phone || '',
        },
        theme: {
          color: '#F4B03F',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error: any) {
      console.error("Subscription process failed:", error);
      toast({
        variant: 'destructive',
        title: 'Subscription Failed',
        description: error.message,
      });
    } finally {
        setIsProcessing(false);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl w-full">
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
            
            const isSelected = selectedPlan?.id === plan.id;

            return (
                <Card
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={cn(
                        'flex flex-col cursor-pointer transition-all duration-200 relative overflow-hidden',
                        isSelected ? 'border-primary ring-2 ring-primary shadow-lg' : 'hover:border-primary/50 hover:shadow-md'
                    )}
                >
                    {plan.highlight && (
                        <div className="text-center py-1 bg-primary text-primary-foreground text-sm font-semibold">
                            Most Popular
                        </div>
                    )}
                     {plan.originalPrice && plan.originalPrice > plan.price && (
                        <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 z-10">
                            <BadgePercent className="h-3 w-3"/>
                            Save {Math.round(100 - (plan.price / plan.originalPrice) * 100)}%
                        </div>
                    )}
                    <CardHeader className="pt-8 flex-shrink-0">
                        <CardTitle className="text-xl min-h-[28px]">{plan.name}</CardTitle>
                        <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col justify-between">
                        <div className="flex-grow">
                             <div className="flex items-baseline flex-wrap gap-x-2">
                                <span className="text-4xl font-bold flex items-center gap-1"><IndianRupee className="h-8 w-8"/>{plan.price.toLocaleString('en-IN')}</span>
                                {plan.originalPrice && plan.originalPrice > plan.price && (
                                     <span className="text-lg font-medium text-muted-foreground line-through flex items-center gap-1"><IndianRupee className="h-4 w-4"/>{plan.originalPrice.toLocaleString('en-IN')}</span>
                                )}
                            </div>
                             {plan.durationMonths > 1 && plan.durationMonths < 100 && (
                                 <div className="text-sm text-muted-foreground mb-4">
                                    (Just ₹{Math.round(perMonthCost).toLocaleString('en-IN')}/month)
                                 </div>
                             )}
                            <ul className="space-y-2 pt-4">
                                {plan.features.map((feature) => (
                                <li key={feature} className="flex items-start text-sm">
                                    <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                </li>
                                ))}
                            </ul>
                        </div>
                         <Button variant={isSelected ? 'default' : 'outline'} className="w-full mt-6">
                            {isSelected ? 'Selected' : 'Select Plan'}
                        </Button>
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
          disabled={!selectedPlan || isPlansLoading || isProcessing}
        >
          {isProcessing ? 'Processing...' : selectedPlan ? <>Pay <IndianRupee className="h-5 w-5 mx-1" /> {selectedPlan.price.toLocaleString('en-IN')}</> : 'Select a Plan'}
        </Button>
      </div>
    </div>
  );
}
