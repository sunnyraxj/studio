
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';
import { IndianRupee, PlusCircle, Trash2, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
};

const PlanFormDialog = ({ isOpen, onOpenChange, plan, onSaveSuccess }: { isOpen: boolean, onOpenChange: (open: boolean) => void, plan: Partial<Plan> | null, onSaveSuccess: () => void }) => {
    const [formData, setFormData] = useState<Partial<Plan>>({});
    const firestore = useFirestore();

    useEffect(() => {
        setFormData(plan || {
            name: '',
            price: 0,
            originalPrice: 0,
            durationMonths: 1,
            description: '',
            features: [],
            highlight: false,
            order: 1,
        });
    }, [plan]);
    
    const handleChange = (field: keyof Plan, value: any) => {
        if (field === 'features') {
            setFormData(prev => ({ ...prev, [field]: value.split(',').map((f:string) => f.trim()) }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    }

    const handleSavePlan = async () => {
        if (!firestore) return;

        const planData = {
            ...formData,
            price: Number(formData.price) || 0,
            originalPrice: Number(formData.originalPrice) || 0,
            durationMonths: Number(formData.durationMonths) || 1,
            order: Number(formData.order) || 1,
            highlight: formData.highlight || false,
            features: formData.features || []
        };

        if (!planData.name || !planData.price || !planData.durationMonths) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Name, Price, and Duration are required.' });
            return;
        }

        try {
            if (planData.id) {
                const planRef = doc(firestore, 'global/plans/all', planData.id);
                await updateDoc(planRef, planData);
                toast({ title: 'Success', description: 'Plan updated successfully.' });
            } else {
                const plansCollectionRef = collection(firestore, 'global/plans/all');
                const newDocRef = doc(plansCollectionRef);
                await setDoc(newDocRef, {...planData, id: newDocRef.id});
                toast({ title: 'Success', description: 'New plan added successfully.' });
            }
            onOpenChange(false);
            onSaveSuccess();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    }

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                  <DialogTitle>{plan?.id ? 'Edit Plan' : 'Add New Plan'}</DialogTitle>
                  <DialogDescription>Fill in the details for the subscription plan.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Plan Name</Label>
                    <Input id="name" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Price</Label><div className="relative"><IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" value={formData.price || ''} onChange={e => handleChange('price', e.target.value)} className="pl-8"/></div></div>
                    <div className="space-y-2"><Label>Original Price</Label><div className="relative"><IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" value={formData.originalPrice || ''} onChange={e => handleChange('originalPrice', e.target.value)} className="pl-8" /></div></div>
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Duration (Months)</Label><Input type="number" value={formData.durationMonths || ''} onChange={e => handleChange('durationMonths', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Display Order</Label><Input type="number" value={formData.order || ''} onChange={e => handleChange('order', e.target.value)} /></div>
                   </div>
                   <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description || ''} onChange={e => handleChange('description', e.target.value)} /></div>
                   <div className="space-y-2"><Label>Features (comma-separated)</Label><Textarea value={formData.features?.join(', ') || ''} onChange={e => handleChange('features', e.target.value)} /></div>
                   <div className="flex items-center space-x-2"><Switch id="highlight" checked={formData.highlight} onCheckedChange={checked => handleChange('highlight', checked)} /><Label htmlFor="highlight">Highlight this plan?</Label></div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button onClick={handleSavePlan}>Save Plan</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    );
}

export default function AdminPlansPage() {
  const firestore = useFirestore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Partial<Plan> | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);

  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'global/plans/all');
  }, [firestore]);

  // The useCollection hook will automatically update when Firestore data changes.
  const { data: plansData, isLoading } = useCollection<Plan>(plansQuery);
  
  const sortedPlans = useMemo(() => {
    return plansData?.sort((a, b) => a.order - b.order) || [];
  }, [plansData]);

  const handleAddClick = () => {
    setSelectedPlan(null); // No plan selected means it's a new one
    setIsFormOpen(true);
  };

  const handleEditClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (plan: Plan) => {
    setPlanToDelete(plan);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!planToDelete || !firestore) return;
    try {
      await deleteDoc(doc(firestore, 'global/plans/all', planToDelete.id));
      toast({ title: 'Success', description: 'Plan has been deleted.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsDeleteAlertOpen(false);
      setPlanToDelete(null);
    }
  };

  return (
    <div className="flex-1 space-y-4">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Manage Subscription Plans</CardTitle>
            <CardDescription>
              Add, edit, or delete subscription plans for your application.
            </CardDescription>
          </div>
          <Button onClick={handleAddClick}><PlusCircle className="mr-2 h-4 w-4" /> Add New Plan</Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
          ) : sortedPlans.length > 0 ? (
            sortedPlans.map(plan => (
              <Card key={plan.id} className="relative shadow-sm">
                 {plan.highlight && (
                    <Badge className="absolute -top-2 left-4 z-10">Highlighted</Badge>
                 )}
                <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Price</Label>
                            <p className="font-semibold flex items-center gap-1"><IndianRupee className="h-4 w-4"/>{plan.price.toLocaleString()}
                            {plan.originalPrice && <span className="text-muted-foreground line-through text-sm">₹{plan.originalPrice.toLocaleString()}</span>}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Duration</Label>
                            <p className="font-semibold">{plan.durationMonths >= 1200 ? 'Permanent' : `${plan.durationMonths} Month(s)`}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Display Order</Label>
                            <p className="font-semibold">{plan.order}</p>
                        </div>
                         <div className="space-y-2 md:col-span-2 lg:col-span-3">
                            <Label className="text-xs text-muted-foreground">Features</Label>
                             <ul className="list-disc list-inside text-sm space-y-1">
                                {plan.features.map(f => <li key={f}>{f}</li>)}
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <div className="absolute top-4 right-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(plan)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(plan)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground">
                No subscription plans found.
            </div>
          )}
        </CardContent>
      </Card>
      
      <PlanFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} plan={selectedPlan} onSaveSuccess={() => {}} />
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the plan
                    and may affect existing subscriptions linked to it in Razorpay.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete Plan</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    