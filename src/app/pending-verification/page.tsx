
'use client';

import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Clock, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast.tsx';
import { Button } from '@/components/ui/button';

type UserProfile = {
  subscriptionStatus?: 'active' | 'inactive' | 'pending_verification' | 'rejected';
  shopId?: string;
}

export default function PendingVerificationPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userData, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading && userData) {
            if (userData.subscriptionStatus === 'active') {
                toast({
                    title: "Subscription Activated!",
                    description: "Redirecting you now...",
                });
                if (!userData.shopId) {
                    router.push('/shop-setup');
                } else {
                    router.push('/dashboard');
                }
            } else if (userData.subscriptionStatus === 'rejected') {
                 toast({
                    variant: 'destructive',
                    title: "Payment Failed",
                    description: "Your payment was not successful. Please try again.",
                });
                router.push('/subscribe');
            }
        }
    }, [userData, isUserLoading, isProfileLoading, router]);
    
    // This page is now a fallback. It's possible a user lands here if the client-side
    // verification fails or a webhook is delayed.
    if (userData?.subscriptionStatus === 'pending_verification') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Card className="w-[450px] text-center">
                    <CardHeader>
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                            <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                        <CardTitle>Verification in Progress</CardTitle>
                        <CardDescription>
                            Your payment was successful and we are now activating your subscription.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                This page will automatically redirect you. If it doesn't, please wait a minute and click the button below.
                            </p>
                             <Button onClick={() => router.push('/dashboard')} variant="secondary" className="mt-4">
                                Go to Dashboard
                             </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Default state if user lands here unexpectedly
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
             <Card className="w-[450px] text-center">
                <CardHeader>
                     <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <CardTitle>Checking Status</CardTitle>
                    <CardDescription>
                        Checking your subscription status...
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                         <Button onClick={() => router.push('/dashboard')} variant="secondary" className="mt-4">
                            Go to My Account
                         </Button>
                    </div>
                </CardContent>
             </Card>
        </div>
    )
}
