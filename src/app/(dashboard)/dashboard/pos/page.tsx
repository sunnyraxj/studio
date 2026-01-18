
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewSaleTab } from './components/new-sale-tab';
import { SalesReturnTab } from './components/sales-return-tab';
import { TodaysSalesTab } from './components/todays-sales-tab';
import { FileText, RotateCcw, History, ClipboardList } from 'lucide-react';
import { useShopSettings } from '@/firebase';
import type { KOT } from '../page';
import { KotListTab } from './components/kot-list-tab';


export default function POSPage() {
  const [activeTab, setActiveTab] = useState('new-sale');
  const { settings: shopSettings } = useShopSettings();
  const [kotToBill, setKotToBill] = useState<KOT | null>(null);

  const handleBillFromKot = (kot: KOT) => {
    setKotToBill(kot);
    setActiveTab('new-sale');
  };

  const handleBillingComplete = () => {
    setKotToBill(null);
  };

  return (
    <div className="h-full flex flex-col">
       <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
        <TabsList className={`grid w-full ${shopSettings?.enableKot ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="new-sale">
             <FileText className="mr-2 h-4 w-4" /> New Sale
          </TabsTrigger>
          {shopSettings?.enableKot && (
             <TabsTrigger value="kot-list">
                <ClipboardList className="mr-2 h-4 w-4" /> Active KOTs
            </TabsTrigger>
          )}
          <TabsTrigger value="sales-return">
              <RotateCcw className="mr-2 h-4 w-4" /> Sales Return
          </TabsTrigger>
          <TabsTrigger value="todays-sales">
              <History className="mr-2 h-4 w-4" /> Today's Sales
          </TabsTrigger>
        </TabsList>
        <TabsContent value="new-sale" className="flex-grow">
          <NewSaleTab kotToBill={kotToBill} onBillingComplete={handleBillingComplete} />
        </TabsContent>
         {shopSettings?.enableKot && (
            <TabsContent value="kot-list" className="flex-grow">
                <KotListTab onBillFromKot={handleBillFromKot} />
            </TabsContent>
        )}
        <TabsContent value="sales-return" className="flex-grow">
            <SalesReturnTab />
        </TabsContent>
         <TabsContent value="todays-sales" className="flex-grow">
            <TodaysSalesTab setPosTab={setActiveTab} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
