
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useFirestore, useUser } from '@/firebase';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';

const totalSteps = 3;

export default function ShopSetupPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const isDemoMode = !user;

  const [step, setStep] = useState(1);

  // Step 1: Company Details
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPin, setCompanyPin] = useState('');
  const [companyState, setCompanyState] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // Step 2: UPI Details
  const [wantsUpi, setWantsUpi] = useState<boolean | null>(null);
  const [upiId, setUpiId] = useState('');

  // Step 3: Bank Details
  const [wantsBank, setWantsBank] = useState<boolean | null>(null);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleFinish = async () => {
    if (isDemoMode) {
      toast({
        title: 'Setup Complete! (Demo)',
        description: 'Your shop has been created. Welcome to the dashboard!',
      });
      router.push('/dashboard');
      return;
    }
    
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    
    setIsSaving(true);
    
    try {
        const batch = writeBatch(firestore);

        // 1. Create new shop document
        const shopDocRef = doc(collection(firestore, 'shops'));
        batch.set(shopDocRef, {
            id: shopDocRef.id,
            ownerId: user.uid,
            name: companyName,
        });

        // 2. Create shop settings document
        const settingsDocRef = doc(firestore, `shops/${shopDocRef.id}/settings`, 'details');
        const settingsData = {
            companyName,
            companyAddress,
            companyState,
            companyPin,
            companyPhone,
            upiId: wantsUpi ? upiId : '',
            bankName: wantsBank ? bankName : '',
            accountNumber: wantsBank ? accountNumber : '',
            ifscCode: wantsBank ? ifscCode : '',
            enableKot: true,
        };
        batch.set(settingsDocRef, settingsData);

        // 3. Update user profile with the new shopId
        const userDocRef = doc(firestore, 'users', user.uid);
        batch.update(userDocRef, { shopId: shopDocRef.id });

        await batch.commit();

        toast({
            title: 'Setup Complete!',
            description: 'Your shop has been created. Welcome to the dashboard!',
        });

        router.push('/dashboard');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Setup Failed', description: error.message });
        setIsSaving(false);
    }
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-xl mx-auto">
        <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Set Up Your Shop</h1>
            <p className="text-muted-foreground">Just a few more details to get you started.</p>
        </div>
        
        <Progress value={progress} className="mb-8" />
        
        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Step 1: Company Details</CardTitle>
                <CardDescription>
                  This information will be displayed on your invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Shop / Company Name</Label>
                  <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your Business Name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-address">Address</Label>
                  <Textarea id="company-address" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Full Address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-pin">PIN Code</Label>
                    <Input id="company-pin" value={companyPin} onChange={(e) => setCompanyPin(e.target.value)} placeholder="e.g., 110001" />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="company-state">State</Label>
                    <Input id="company-state" value={companyState} onChange={(e) => setCompanyState(e.target.value)} placeholder="e.g., Delhi" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Phone Number</Label>
                  <Input id="company-phone" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="10-digit mobile number" />
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button onClick={nextStep} disabled={!companyName || !companyAddress || !companyPin || !companyState || !companyPhone}>Next</Button>
              </CardFooter>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Step 2: UPI for Invoices</CardTitle>
                <CardDescription>Do you want to display a QR code for UPI payments on your invoices?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                    <Button variant={wantsUpi === true ? 'default' : 'outline'} onClick={() => setWantsUpi(true)} className="flex-1">Yes</Button>
                    <Button variant={wantsUpi === false ? 'default' : 'outline'} onClick={() => setWantsUpi(false)} className="flex-1">No</Button>
                </div>
                {wantsUpi === true && (
                  <div className="space-y-2 !mt-6">
                    <Label htmlFor="upi-id">Your UPI ID</Label>
                    <Input id="upi-id" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@oksbi" />
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>Back</Button>
                <Button onClick={nextStep} disabled={wantsUpi === null || (wantsUpi && !upiId)}>Next</Button>
              </CardFooter>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Step 3: Bank Details for Invoices</CardTitle>
                <CardDescription>Do you want to display bank account details on your invoices for transfers?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex gap-4">
                    <Button variant={wantsBank === true ? 'default' : 'outline'} onClick={() => setWantsBank(true)} className="flex-1">Yes</Button>
                    <Button variant={wantsBank === false ? 'default' : 'outline'} onClick={() => setWantsBank(false)} className="flex-1">No</Button>
                </div>
                {wantsBank === true && (
                  <div className="space-y-4 !mt-6">
                    <div className="space-y-2">
                        <Label htmlFor="bank-name">Bank Name</Label>
                        <Input id="bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g., State Bank of India" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="account-number">Account Number</Label>
                        <Input id="account-number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Enter account number" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ifsc-code">IFSC Code</Label>
                        <Input id="ifsc-code" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} placeholder="Enter IFSC code" />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>Back</Button>
                <Button onClick={handleFinish} disabled={isSaving || wantsBank === null || (wantsBank && (!bankName || !accountNumber || !ifscCode))}>
                  {isSaving ? 'Saving...' : 'Finish Setup'}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
