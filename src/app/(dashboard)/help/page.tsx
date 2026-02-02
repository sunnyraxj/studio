'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, Phone, MessageSquare } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';


export default function ContactSupportPage() {
    const { t } = useTranslation();
  return (
    <div className="flex-1 space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">{t('Contact Support')}</h2>
      <p className="text-muted-foreground">
        {t('Have questions or need help? Reach out to us through one of the methods below.')}
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
              <a href="mailto:support@axombilling.com" className="text-primary font-medium hover:underline">
                support@axombilling.com
              </a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-muted rounded-full">
              <Phone className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{t('Phone Support')}</h3>
              <p className="text-muted-foreground">{t('For urgent matters, call us directly.')}</p>
              <a href="tel:+911234567890" className="text-primary font-medium hover:underline">
                +91 12345 67890
              </a>
            </div>
          </div>
           <div className="flex items-start gap-4">
            <div className="p-3 bg-muted rounded-full">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{t('WhatsApp')}</h3>
              <p className="text-muted-foreground">{t('Chat with us for quick questions.')}</p>
              <a href="https://wa.me/911234567890" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                +91 12345 67890
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
