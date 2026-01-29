
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DeprecatedPaymentPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-[450px] text-center">
            <CardHeader>
                <CardTitle>Page Deprecated</CardTitle>
                <CardDescription>
                    This payment verification page is no longer in use. Our new automated system handles payments instantly.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    If you were redirected here, please go to the new subscription page to complete your payment.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/subscribe">Go to Subscription Page</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
