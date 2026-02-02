'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';


export default function ContactSupportPage() {
    const { t } = useTranslation();
  return (
    <div className="flex-1 space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">{t('Contact Support')}</h2>
      <p className="text-muted-foreground">
        Have questions or need help? Reach out to us through the method below.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>{t('Our Contact Information')}</CardTitle>
          <CardDescription>{t("We're available during business hours to assist you.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-muted rounded-full">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{t('Email Support')}</h3>
              <p className="text-muted-foreground">{t('The best way to reach us for any issue.')}</p>
              <a href="mailto:apnabillingerp@gmail.com" className="text-primary font-medium hover:underline">
                apnabillingerp@gmail.com
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
