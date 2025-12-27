
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';
import { IndianRupee } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type Plan = {
  id: string;
  name: string;
  price: number;
  durationMonths: number;
  order: number;
};

const defaultPlans: Omit<Plan, 'id'>[] = [
    {
        name: 'Monthly',
        price: 799,
        durationMonths: 1,
        description: 'Perfect for getting started and trying out all features.',
        features: ['Full POS Access', 'Inventory Management', 'Sales Analytics', 'Email Support'],
        highlight: false,
        order: 1,
    },
    {
        name: 'Quarterly',
        price: 2099,
        durationMonths: 3,
        description: 'A great balance of commitment and savings.',
        features: ['Full POS Access', 'Inventory Management', 'Sales Analytics', 'Priority Email Support'],
        highlight: false,
        order: 2,
    },
    {
        name: 'Yearly',
        price: 7499,
        durationMonths: 12,
        description: 'Best value for long-term business management.',
        features: ['Full POS Access', 'Inventory Management', 'Sales Analytics', '24/7 Priority Support', 'Early access to new features'],
        highlight: true,
        order: 3,
    },
    {
        name: 'Permanent',
        price: 29999,
        durationMonths: 1200, // 100 years
        description: 'One-time payment for lifetime access.',
        features: ['Full POS Access', 'Inventory Management', 'Sales Analytics', 'Lifetime Priority Support', 'All future updates'],
        highlight: false,
        order: 5,
    },
];

export default function AdminPlansPage() {
  const firestore = useFirestore();

  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const plansCollectionRef = collection(firestore, `global/plans/all`);
    return plansCollectionRef;
  }, [firestore]);

  const { data: plansData, isLoading } = useCollection<Plan>(plansQuery);

  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isSeeding, setIsSeeding] = useState(false);

  useMemo(() => {
    if (plansData) {
      const initialPrices = plansData.reduce((acc, plan) => {
        acc[plan.id] = plan.price;
        return acc;
      }, {} as Record<string, number>);
      setPrices(initialPrices);
    }
  }, [plansData]);

  const handlePriceChange = (planId: string, newPrice: string) => {
    setPrices(prev => ({ ...prev, [planId]: Number(newPrice) }));
  };
  
  const handleSeedPlans = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore not available.' });
      return;
    }
    setIsSeeding(true);
    const batch = writeBatch(firestore);
    const plansCollectionRef = collection(firestore, 'global/plans/all');

    defaultPlans.forEach(plan => {
      const newPlanRef = doc(plansCollectionRef);
      batch.set(newPlanRef, { ...plan, id: newPlanRef.id });
    });
    
    try {
        await batch.commit();
        toast({ title: 'Success!', description: 'Default plans have been seeded.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Seeding Failed', description: error.message });
    } finally {
        setIsSeeding(false);
    }
  }


  const handleSave = async () => {
    if (!firestore || !plansData) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save plans.',
      });
      return;
    }
    
    const batch = writeBatch(firestore);
    plansData.forEach(plan => {
      const newPrice = prices[plan.id];
      if (newPrice !== plan.price) {
        const planDocRef = doc(firestore, `global/plans/all`, plan.id);
        batch.update(planDocRef, { price: newPrice });
      }
    });

    try {
      await batch.commit();
      toast({
        title: 'Success!',
        description: 'Subscription plan prices have been updated.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message,
      });
    }
  };
  
  const sortedPlans = useMemo(() => {
    return plansData?.sort((a,b) => a.order - b.order) || [];
  }, [plansData])


  return (
    <div className="flex-1 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Subscription Plans</CardTitle>
          <CardDescription>
            Update the pricing for each subscription plan. Changes will be reflected immediately for new subscribers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : sortedPlans.length > 0 ? (
            sortedPlans.map(plan => (
              <div key={plan.id} className="flex items-end justify-between gap-4 p-4 border rounded-lg bg-muted/50">
                <div className='flex-1'>
                  <Label htmlFor={`price-${plan.id}`} className="text-lg font-semibold">{plan.name}</Label>
                  <p className="text-sm text-muted-foreground">{plan.durationMonths === 1200 ? 'Permanent (100 years)' : `${plan.durationMonths} Month(s)`}</p>
                </div>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id={`price-${plan.id}`}
                    type="number"
                    value={prices[plan.id] || ''}
                    onChange={(e) => handlePriceChange(plan.id, e.target.value)}
                    className="pl-8 text-right w-36 text-lg font-bold"
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10">
                <p className="text-muted-foreground">No subscription plans found in the database.</p>
                <Button onClick={handleSeedPlans} disabled={isSeeding} className="mt-4">
                    {isSeeding ? 'Seeding Plans...' : 'Create Default Plans'}
                </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end">
            <Button onClick={handleSave} disabled={isLoading || sortedPlans.length === 0}>Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
