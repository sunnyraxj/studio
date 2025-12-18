
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';

type UserProfile = {
  subscriptionStatus?: string;
};

export default function PendingVerificationPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (isUserLoading || isProfileLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (userData?.subscriptionStatus === 'active') {
      router.push('/dashboard');
    } else if (userData?.subscriptionStatus === 'inactive') {
      router.push('/subscribe');
    }
  }, [user, userData, isUserLoading, isProfileLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[450px] text-center">
        <CardHeader>
          <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit">
            <Hourglass className="h-8 w-8" />
          </div>
          <CardTitle className="mt-4">Verification Pending</CardTitle>
          <CardDescription>
            Your payment has been submitted and is currently awaiting verification from our team. This usually takes a few hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You will be notified once your account is activated. You can then log in to access your dashboard.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => router.push('/login')}>
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
