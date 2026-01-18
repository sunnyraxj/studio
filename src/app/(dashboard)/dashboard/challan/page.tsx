'use client';

import { useState, Suspense } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { NewChallanTab } from './components/new-challan-tab';
import { ChallanListTab } from './components/challan-list-tab';
import { useTranslation } from '@/hooks/use-translation';

export default function ChallanPage() {
    const { t } = useTranslation();
    return (
        <Suspense fallback={<div>{t('Loading...')}</div>}>
            <Tabs defaultValue="new-challan" className="space-y-4">
            <TabsList>
                <TabsTrigger value="new-challan">{t('New Challan')}</TabsTrigger>
                <TabsTrigger value="challan-list">{t('Challan List')}</TabsTrigger>
            </TabsList>
            <TabsContent value="new-challan" className="space-y-4">
                <NewChallanTab />
            </TabsContent>
            <TabsContent value="challan-list">
                <ChallanListTab />
            </TabsContent>
            </Tabs>
        </Suspense>
    );
}
