
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
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, query, orderBy } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';
import { PlusCircle, Trash2, Pencil, ShoppingCart, LayoutDashboard, BarChart } from 'lucide-react';
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
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type HomepageFeature = {
  id: string;
  title: string;
  description: string;
  icon: string;
  keyPoints: string[];
  imageId: string;
  order: number;
};

const initialFeatures: Omit<HomepageFeature, 'id'>[] = [
    {
      title: 'Effortless Point of Sale',
      description: 'A fast, intuitive POS system that makes billing a breeze.',
      icon: 'ShoppingCart',
      keyPoints: ['Handle Sales', 'Process Returns', 'Create Challans'],
      imageId: 'feature-pos',
      order: 1
    },
    {
      title: 'Smart Inventory Control',
      description: 'Manage your products, track stock levels, and generate barcodes.',
      icon: 'LayoutDashboard',
      keyPoints: ['Product Management', 'Stock Tracking', 'Barcode Generation'],
      imageId: 'feature-inventory',
      order: 2
    },
    {
      title: 'Insightful Analytics',
      description: 'Get a clear view of your business performance with powerful reports.',
      icon: 'BarChart',
      keyPoints: ['Sales Reports', 'Profit Margins', 'Top Products'],
      imageId: 'feature-dashboard',
      order: 3
    }
];

const iconMap: { [key: string]: React.FC<any> } = {
  ShoppingCart,
  LayoutDashboard,
  BarChart
};


const FeatureFormDialog = ({ isOpen, onOpenChange, feature, onSaveSuccess }: { isOpen: boolean, onOpenChange: (open: boolean) => void, feature: Partial<HomepageFeature> | null, onSaveSuccess: () => void }) => {
    const [formData, setFormData] = useState<Partial<HomepageFeature>>({});
    const firestore = useFirestore();

    useEffect(() => {
        setFormData(feature || {
            title: '',
            description: '',
            icon: 'ShoppingCart',
            keyPoints: [],
            imageId: '',
            order: 1
        });
    }, [feature]);
    
    const handleChange = (field: keyof HomepageFeature, value: any) => {
        if (field === 'keyPoints') {
            setFormData(prev => ({ ...prev, [field]: value.split(',').map((f:string) => f.trim()) }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    }

    const handleSaveFeature = async () => {
        if (!firestore) return;

        const featureData = {
            ...formData,
            order: Number(formData.order) || 1,
            keyPoints: formData.keyPoints || []
        };

        if (!featureData.title || !featureData.description || !featureData.icon || !featureData.imageId) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'All fields are required.' });
            return;
        }

        try {
            if (featureData.id) {
                const featureRef = doc(firestore, 'global/homepageFeatures', featureData.id);
                await updateDoc(featureRef, featureData);
                toast({ title: 'Success', description: 'Feature updated successfully.' });
            } else {
                const featuresCollectionRef = collection(firestore, 'global/homepageFeatures');
                const newDocRef = doc(featuresCollectionRef);
                await setDoc(newDocRef, {...featureData, id: newDocRef.id});
                toast({ title: 'Success', description: 'New feature added successfully.' });
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
                  <DialogTitle>{feature?.id ? 'Edit Feature' : 'Add New Feature'}</DialogTitle>
                  <DialogDescription>Manage the content for a feature card on the homepage.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} />
                  </div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description || ''} onChange={e => handleChange('description', e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Icon Name</Label><Input placeholder="e.g., ShoppingCart" value={formData.icon || ''} onChange={e => handleChange('icon', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Display Order</Label><Input type="number" value={formData.order || ''} onChange={e => handleChange('order', e.target.value)} /></div>
                  </div>
                   <div className="space-y-2"><Label>Image ID</Label><Input placeholder="From placeholder-images.json" value={formData.imageId || ''} onChange={e => handleChange('imageId', e.target.value)} /></div>
                   <div className="space-y-2"><Label>Key Points (comma-separated)</Label><Textarea placeholder="Point 1, Point 2, Point 3" value={formData.keyPoints?.join(', ') || ''} onChange={e => handleChange('keyPoints', e.target.value)} /></div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button onClick={handleSaveFeature}>Save Feature</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    );
}

export default function AdminHomepageFeaturesPage() {
  const firestore = useFirestore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Partial<HomepageFeature> | null>(null);
  const [featureToDelete, setFeatureToDelete] = useState<HomepageFeature | null>(null);

  const featuresQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'global/homepageFeatures'), orderBy('order'));
  }, [firestore]);

  const { data: featuresData, isLoading } = useCollection<HomepageFeature>(featuresQuery);

  useEffect(() => {
    if (!isLoading && featuresData?.length === 0 && firestore) {
        const seedData = async () => {
            console.log("Seeding initial homepage features...");
            const batch = writeBatch(firestore);
            const featuresCollectionRef = collection(firestore, 'global/homepageFeatures');
            initialFeatures.forEach(feature => {
                const docRef = doc(featuresCollectionRef, feature.imageId); // Use imageId as doc id
                batch.set(docRef, { ...feature, id: docRef.id });
            });
            await batch.commit();
            toast({ title: 'Homepage features seeded successfully.'});
        };
        seedData();
    }
  }, [isLoading, featuresData, firestore]);

  const handleAddClick = () => {
    setSelectedFeature(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (feature: HomepageFeature) => {
    setSelectedFeature(feature);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (feature: HomepageFeature) => {
    setFeatureToDelete(feature);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!featureToDelete || !firestore) return;
    try {
      await deleteDoc(doc(firestore, 'global/homepageFeatures', featureToDelete.id));
      toast({ title: 'Success', description: 'Feature has been deleted.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsDeleteAlertOpen(false);
      setFeatureToDelete(null);
    }
  };

  return (
    <div className="flex-1 space-y-4">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Manage Homepage Features</CardTitle>
            <CardDescription>
              Add, edit, or delete the feature cards shown on the landing page.
            </CardDescription>
          </div>
          <Button onClick={handleAddClick}><PlusCircle className="mr-2 h-4 w-4" /> Add New Feature</Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
          ) : featuresData && featuresData.length > 0 ? (
            featuresData.map(feature => {
              const featureImage = PlaceHolderImages.find(p => p.id === feature.imageId);
              const IconComponent = iconMap[feature.icon];

              return (
              <Card key={feature.id} className="relative shadow-sm flex gap-6 p-4">
                {featureImage && (
                    <Image
                        src={featureImage.imageUrl}
                        width={250}
                        height={250}
                        alt={feature.title}
                        className="rounded-lg object-cover aspect-square"
                    />
                )}
                <div className="flex-1">
                    <CardHeader className="p-0">
                        <CardTitle className="flex items-center gap-2">
                           {IconComponent && <IconComponent className="h-5 w-5" />} {feature.title}
                        </CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 pt-4">
                         <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Key Points</Label>
                             <ul className="list-disc list-inside text-sm space-y-1">
                                {feature.keyPoints.map(f => <li key={f}>{f}</li>)}
                            </ul>
                        </div>
                    </CardContent>
                </div>
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(feature)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(feature)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                </div>
              </Card>
            )})
          ) : (
            <div className="text-center py-10 text-muted-foreground">
                No homepage features found.
            </div>
          )}
        </CardContent>
      </Card>
      
      <FeatureFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} feature={selectedFeature} onSaveSuccess={() => {}} />
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the feature card from the homepage.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete Feature</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
