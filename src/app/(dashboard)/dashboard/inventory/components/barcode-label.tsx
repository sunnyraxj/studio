
'use client';

import React from 'react';
import Barcode from 'react-barcode';
import type { InventoryItem } from '../page';
import { Badge } from '@/components/ui/badge';

interface BarcodeLabelProps {
    item: Partial<InventoryItem>;
    shopName: string;
    isQuickBarcode?: boolean;
}

export const BarcodeLabel: React.FC<BarcodeLabelProps> = ({ item, shopName, isQuickBarcode = false }) => {
    if (!item.sku && !isQuickBarcode) {
        return <div className="p-4 text-center text-red-500">SKU is required to generate a barcode.</div>;
    }

    return (
        <div 
            className="bg-white text-black flex flex-col items-center justify-between font-sans p-2 border border-black" 
            style={{ width: '2.5in', height: '1.5in', boxSizing: 'border-box' }}
        >
            <div className="relative w-full text-center">
                <p className="text-xs font-bold uppercase truncate">{shopName}</p>
                {isQuickBarcode && (
                    <Badge variant="destructive" className="text-xs scale-75 origin-right absolute top-0 right-0">Quick</Badge>
                )}
            </div>
            
            <div className="flex flex-col items-center">
                <p className="text-lg font-bold truncate max-w-full -mb-1">{item.name}</p>
                 <Barcode 
                    value={item.sku || 'N/A'}
                    width={1.2}
                    height={30}
                    fontSize={10}
                    margin={2}
                    displayValue={!!item.sku}
                    fontOptions="bold"
                />
            </div>
            
            <div className="flex justify-center items-center w-full">
              <p className="text-lg font-bold uppercase">
                  MRP: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.price || 0)}
              </p>
            </div>
        </div>
    );
};
