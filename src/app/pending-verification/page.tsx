
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DeprecatedPendingVerificationPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-[450px] text-center">
            <CardHeader>
                <CardTitle>Page Deprecated</CardTitle>
                <CardDescription>
                    This manual verification page is no longer needed.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Our new automated system activates your subscription instantly upon successful payment. If your payment was successful, you can now access your dashboard.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
