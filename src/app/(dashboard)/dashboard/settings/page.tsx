
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';

type ShopSettings = {
    companyName?: string;
    companyAddress?: string;
    companyGstin?: string;
    companyPhone?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
}

type UserProfile = {
  shopId?: string;
}


export default function SettingsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const isDemoMode = !user;

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);
  const { data: userData } = useDoc<UserProfile>(userDocRef);
  const shopId = userData?.shopId;

  const settingsDocRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return doc(firestore, `shops/${shopId}/settings`, 'details');
  }, [firestore, shopId, isDemoMode]);

  const { data: settingsData, isLoading } = useDoc<ShopSettings>(settingsDocRef);

  // State for Company Details
  const [companyName, setCompanyName] = useState('Demo Company');
  const [companyAddress, setCompanyAddress] = useState('123 Demo Street, Suite 456, Demo City, 12345');
  const [companyGstin, setCompanyGstin] = useState('29DEMOCOMPANY1Z9');
  const [companyPhone, setCompanyPhone] = useState('9876543210');

  // State for Bank Details
  const [bankName, setBankName] = useState('Demo Bank');
  const [accountNumber, setAccountNumber] = useState('1234567890');
  const [ifscCode, setIfscCode] = useState('DEMO0001234');

  // State for UPI Details
  const [upiId, setUpiId] = useState('demo@upi');

  useEffect(() => {
    if (!isDemoMode && settingsData) {
        setCompanyName(settingsData.companyName || '');
        setCompanyAddress(settingsData.companyAddress || '');
        setCompanyGstin(settingsData.companyGstin || '');
        setCompanyPhone(settingsData.companyPhone || '');
        setBankName(settingsData.bankName || '');
        setAccountNumber(settingsData.accountNumber || '');
        setIfscCode(settingsData.ifscCode || '');
        setUpiId(settingsData.upiId || '');
    }
  }, [settingsData, isDemoMode]);


  const handleSave = async () => {
    if (isDemoMode) {
      toast({ variant: 'destructive', title: 'Demo Mode', description: 'Log in and subscribe to save your settings.' });
      router.push('/login');
      return;
    }
    if (!settingsDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot save settings. Shop not found.' });
        return;
    }
    const newSettings: ShopSettings = {
      companyName,
      companyAddress,
      companyGstin,
      companyPhone,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
    };
    
    try {
        await setDoc(settingsDocRef, newSettings, { merge: true });
        toast({ title: 'Success', description: 'Settings saved successfully!' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error saving settings', description: error.message });
    }
  };

  if (isLoading && !isDemoMode) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="flex-1 space-y-4">
       <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
       <p className="text-muted-foreground">
          Manage your company, bank, and payment details for invoices.
       </p>
       <Separator />
      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company">Company Details</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
          <TabsTrigger value="upi">UPI / QR Code</TabsTrigger>
        </TabsList>
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>
                This information will be displayed on your invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="Enter your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-address">Company Address</Label>
                <Textarea
                  id="company-address"
                  placeholder="Enter your company's full address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-phone">Phone Number</Label>
                <Input
                  id="company-phone"
                  placeholder="Enter your company's phone number"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-gstin">GSTIN</Label>
                <Input
                  id="company-gstin"
                  placeholder="Enter your company's GSTIN"
                  value={companyGstin}
                  onChange={(e) => setCompanyGstin(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bank" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
              <CardDescription>
                These bank details will be shown on invoices for bank transfer payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank-name">Bank Name</Label>
                <Input
                  id="bank-name"
                  placeholder="e.g., State Bank of India"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-number">Account Number</Label>
                <Input
                  id="account-number"
                  placeholder="Enter your bank account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifsc-code">IFSC Code</Label>
                <Input
                  id="ifsc-code"
                  placeholder="Enter your bank's IFSC code"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="upi" className="space-y-4">
           <Card>
            <CardHeader>
              <CardTitle>UPI Details</CardTitle>
              <CardDescription>
                Enter your UPI ID to automatically generate a QR code on invoices for easy payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upi-id">UPI ID</Label>
                <Input
                  id="upi-id"
                  placeholder="e.g., yourname@oksbi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}
