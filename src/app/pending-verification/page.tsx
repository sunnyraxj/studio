
'use client';

import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast.tsx';

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
                            Please wait a moment. This page will automatically redirect you once the process is complete.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
