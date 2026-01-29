
'use client';

import { useState, useMemo, useEffect } from 'react';
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
  originalPrice?: number;
  durationMonths: number;
  order: number;
  description: string;
  features: string[];
  highlight: boolean;
  razorpayPlanId?: string;
};

const defaultPlans: Omit<Plan, 'id'>[] = [
    {
        name: 'Monthly',
        price: 799,
        originalPrice: 999,
        durationMonths: 1,
        description: 'Perfect for getting started and trying out all features.',
        features: ['Full POS Access', 'Inventory Management', 'Sales Analytics', 'Email Support'],
        highlight: false,
        order: 1,
        razorpayPlanId: '',
    },
    {
        name: 'Quarterly',
        price: 2099,
        originalPrice: 2997,
        durationMonths: 3,
        description: 'A great balance of commitment and savings.',
        features: ['Full POS Access', 'Inventory Management', 'Sales Analytics', 'Priority Email Support'],
        highlight: false,
        order: 2,
        razorpayPlanId: '',
    },
    {
        name: 'Yearly',
        price: 7499,
        originalPrice: 11988,
        durationMonths: 12,
        description: 'Best value for long-term business management.',
        features: ['Full POS Access', 'Inventory Management', 'Sales Analytics', '24/7 Priority Support', 'Early access to new features'],
        highlight: true,
        order: 3,
        razorpayPlanId: '',
    },
    {
        name: 'Permanent',
        price: 29999,
        originalPrice: 49999,
        durationMonths: 1200, // 100 years
        description: 'One-time payment for lifetime access.',
        features: ['Full POS Access', 'Inventory Management', 'Sales Analytics', 'Lifetime Priority Support', 'All future updates'],
        highlight: false,
        order: 5,
        razorpayPlanId: '',
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

  const [planDetails, setPlanDetails] = useState<Record<string, Partial<Plan>>>({});
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    if (plansData) {
      const initialDetails = plansData.reduce((acc, plan) => {
        acc[plan.id] = { 
            price: plan.price, 
            originalPrice: plan.originalPrice,
            razorpayPlanId: plan.razorpayPlanId,
        };
        return acc;
      }, {} as Record<string, Partial<Plan>>);
      setPlanDetails(initialDetails);
    }
  }, [plansData]);

  const handleDetailChange = (planId: string, field: keyof Plan, value: string | number) => {
    setPlanDetails(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [field]: value
      }
    }));
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
      const newDetails = planDetails[plan.id];
      if (newDetails) {
        const planDocRef = doc(firestore, `global/plans/all`, plan.id);
        const updateData: Partial<Plan> = {};
        if (newDetails.price !== undefined && newDetails.price !== plan.price) {
          updateData.price = newDetails.price;
        }
        if (newDetails.originalPrice !== undefined && newDetails.originalPrice !== plan.originalPrice) {
          updateData.originalPrice = newDetails.originalPrice;
        }
        if (newDetails.razorpayPlanId !== undefined && newDetails.razorpayPlanId !== plan.razorpayPlanId) {
          updateData.razorpayPlanId = newDetails.razorpayPlanId;
        }
        if (Object.keys(updateData).length > 0) {
          batch.update(planDocRef, updateData);
        }
      }
    });

    try {
      await batch.commit();
      toast({
        title: 'Success!',
        description: 'Subscription plan details have been updated.',
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
            Update plan details. Link each plan to a corresponding Plan ID from your Razorpay dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
          ) : sortedPlans.length > 0 ? (
            sortedPlans.map(plan => (
              <div key={plan.id} className="grid grid-cols-1 md:grid-cols-2 items-end gap-4 p-4 border rounded-lg bg-muted/50">
                <div className='flex-1 md:col-span-2'>
                  <Label className="text-lg font-semibold">{plan.name}</Label>
                  <p className="text-sm text-muted-foreground">{plan.durationMonths === 1200 ? 'Permanent (100 years)' : `${plan.durationMonths} Month(s)`}</p>
                </div>

                <div className="relative">
                  <Label>Razorpay Plan ID</Label>
                  <Input
                    value={planDetails[plan.id]?.razorpayPlanId || ''}
                    onChange={(e) => handleDetailChange(plan.id, 'razorpayPlanId', e.target.value)}
                    className="w-full"
                    placeholder="e.g. plan_XXXXXXXXXXXXXX"
                  />
                </div>
                 <div className="relative">
                  <Label>Current Price</Label>
                  <IndianRupee className="absolute left-3 top-1/2 mt-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={planDetails[plan.id]?.price || ''}
                    onChange={(e) => handleDetailChange(plan.id, 'price', Number(e.target.value))}
                    className="pl-8 text-right w-full text-lg font-bold"
                     placeholder="e.g. 799"
                  />
                </div>
                <div className="relative md:col-span-2">
                  <Label>Original Price (Optional, for showing a discount)</Label>
                  <IndianRupee className="absolute left-3 top-1/2 mt-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={planDetails[plan.id]?.originalPrice || ''}
                    onChange={(e) => handleDetailChange(plan.id, 'originalPrice', Number(e.target.value))}
                    className="pl-8 text-right w-full text-base"
                    placeholder="e.g. 999"
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
