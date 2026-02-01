
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
                    This payment page is no longer in use. Our new system handles payments automatically.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    If your payment was successful, please go to your subscription page. Your plan will be activated shortly.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/dashboard/subscription">Go to My Subscription</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}

    