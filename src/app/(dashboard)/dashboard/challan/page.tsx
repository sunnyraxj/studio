
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

export default function ChallanPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Tabs defaultValue="new-challan" className="space-y-4">
            <TabsList>
                <TabsTrigger value="new-challan">New Challan</TabsTrigger>
                <TabsTrigger value="challan-list">Challan List</TabsTrigger>
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
