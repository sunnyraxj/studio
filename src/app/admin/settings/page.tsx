
'use client';

import { useState, useEffect } from 'react';
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
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';

type AdminSettings = {
    paymentUpiId?: string;
}

export default function AdminSettingsPage() {
  const firestore = useFirestore();

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    // Using a specific document for global admin settings
    return doc(firestore, `shops/global/settings`, 'details');
  }, [firestore]);

  const { data: settingsData, isLoading } = useDoc<AdminSettings>(settingsDocRef);

  const [paymentUpiId, setPaymentUpiId] = useState('');

  useEffect(() => {
    if (settingsData) {
        setPaymentUpiId(settingsData.paymentUpiId || '');
    }
  }, [settingsData]);


  const handleSave = async () => {
    if (!settingsDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot save settings. Firestore not available.' });
        return;
    }
    const newSettings: AdminSettings = {
      paymentUpiId,
    };
    
    try {
        await setDoc(settingsDocRef, newSettings, { merge: true });
        toast({ title: 'Success', description: 'Settings saved successfully!' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error saving settings', description: error.message });
    }
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="flex-1 space-y-4">
       <h2 className="text-3xl font-bold tracking-tight">Admin Settings</h2>
       <p className="text-muted-foreground">
          Manage global settings for the application.
       </p>
      <Card>
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
          <CardDescription>
            This UPI ID will be used to generate the QR code for user subscription payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upi-id">Master UPI ID</Label>
            <Input
              id="upi-id"
              placeholder="e.g., your-business@oksbi"
              value={paymentUpiId}
              onChange={(e) => setPaymentUpiId(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}
