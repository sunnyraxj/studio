'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Banknote, CreditCard, Smartphone, IndianRupee } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

export const PaymentBreakdownCard = ({ title, totals, isLoading, className }: { title: string, totals: { cash: number; card: number; upi: number; }, isLoading: boolean, className?: string }) => {
    const { t } = useTranslation();

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm">
                        <Banknote className="h-4 w-4 mr-2 text-muted-foreground" />
                        {t('Cash')}
                    </div>
                     {isLoading ? <Skeleton className="h-5 w-20" /> : <div className="font-semibold flex items-center gap-1"><IndianRupee className="h-4 w-4" />{totals.cash.toLocaleString('en-IN')}</div>}
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm">
                        <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                        {t('Card')}
                    </div>
                    {isLoading ? <Skeleton className="h-5 w-20" /> : <div className="font-semibold flex items-center gap-1"><IndianRupee className="h-4 w-4" />{totals.card.toLocaleString('en-IN')}</div>}
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm">
                        <Smartphone className="h-4 w-4 mr-2 text-muted-foreground" />
                        {t('UPI')}
                    </div>
                    {isLoading ? <Skeleton className="h-5 w-20" /> : <div className="font-semibold flex items-center gap-1"><IndianRupee className="h-4 w-4" />{totals.upi.toLocaleString('en-IN')}</div>}
                </div>
            </CardContent>
        </Card>
    );
};
