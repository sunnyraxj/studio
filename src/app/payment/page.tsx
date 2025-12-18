
'use client';

import { useEffect, useState } from 'react';
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
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UserProfile = {
  subscriptionStatus?: 'active' | 'inactive' | 'pending_verification';
  planName?: string;
  planPrice?: number;
};

type AdminSettings = {
    paymentUpiId?: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const adminSettingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'shops/global/settings', 'details');
  }, [firestore]);

  const { data: userData, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  const { data: adminSettingsData, isLoading: isAdminSettingsLoading } = useDoc<AdminSettings>(adminSettingsDocRef);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [utr, setUtr] = useState('');
  const [paymentStep, setPaymentStep] = useState<'pay' | 'utr'>('pay');
  const [qrCodeUrl, setQrCodeUrl] = useState("https://picsum.photos/seed/qr/250/250");

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (adminSettingsData?.paymentUpiId && userData?.planPrice) {
        // This is a placeholder for a real QR code generation service.
        // In a real app, you would call an API to generate a QR code for the UPI deeplink.
        const upiDeepLink = `upi://pay?pa=${adminSettingsData.paymentUpiId}&pn=Acme%20Inc&am=${userData.planPrice}&cu=INR&tn=Subscription`;
        console.log("Generated UPI Deep Link:", upiDeepLink);
        // For demonstration, we'll continue to use a placeholder image.
        // You would replace this with the URL of the generated QR code.
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiDeepLink)}`);
    }
  }, [adminSettingsData, userData]);

  const handleProceedToUtr = () => {
    setPaymentStep('utr');
  };

  const handleSubmitUtr = async () => {
    if (!utr) {
      toast({
        variant: 'destructive',
        title: 'UTR Required',
        description: 'Please enter the transaction reference number.',
      });
      return;
    }
    
    if (!userDocRef) return;

    setIsProcessing(true);
    
    try {
      await updateDoc(userDocRef, { utr: utr });
      toast({
        title: 'Payment Submitted',
        description: 'Your payment is being processed and is now pending verification from an admin.',
      });
      router.push('/pending-verification');
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: `Failed to save UTR. ${error.message}`,
        });
        setIsProcessing(false);
    }
  };

  if (isUserLoading || isProfileLoading || isAdminSettingsLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading Payment Details...</div>;
  }

  if (userData?.subscriptionStatus === 'active') {
     router.push('/dashboard');
     return null;
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {paymentStep === 'pay' && (
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>
              Scan the QR code with your UPI app to complete the payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border rounded-md p-4 bg-muted/20">
              <span className="font-medium">{userData?.planName || 'Pro Plan'}</span>
              <span className="font-bold text-lg">₹{userData?.planPrice?.toLocaleString('en-IN') || '799'}/month</span>
            </div>
            <div className="flex justify-center items-center p-4 border rounded-md">
                <Image 
                    src={qrCodeUrl}
                    width={250}
                    height={250}
                    alt="UPI QR Code"
                    data-ai-hint="qr code"
                    unoptimized // Necessary for external QR code services
                />
            </div>
             <p className="text-sm text-muted-foreground text-center">
                Pay to: {adminSettingsData?.paymentUpiId || 'admin@upi'}
             </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleProceedToUtr}>
              Proceed to Enter UTR
            </Button>
          </CardFooter>
        </Card>
      )}

      {paymentStep === 'utr' && (
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle>Submit Transaction Reference</CardTitle>
            <CardDescription>
              Enter the UTR / Transaction ID from your payment app to confirm your payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="utr">UTR / Transaction ID</Label>
                <Input
                  id="utr"
                  placeholder="Enter your 12-digit UTR"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  maxLength={12}
                />
              </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" onClick={handleSubmitUtr} disabled={isProcessing}>
              {isProcessing ? 'Submitting...' : 'Submit for Verification'}
            </Button>
             <Button variant="outline" className="w-full" onClick={() => setPaymentStep('pay')}>
              Back to QR Code
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
