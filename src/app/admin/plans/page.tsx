
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

export default function AdminPlansPage() {
  const firestore = useFirestore();

  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const plansCollectionRef = collection(firestore, `global/plans/all`);
    return plansCollectionRef;
  }, [firestore]);

  const { data: plansData, isLoading } = useCollection<Plan>(plansQuery);

  const [prices, setPrices] = useState<Record<string, number>>({});

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
            <p>No subscription plans found. They may need to be seeded.</p>
          )}
        </CardContent>
        <CardFooter className="justify-end">
            <Button onClick={handleSave} disabled={isLoading}>Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

