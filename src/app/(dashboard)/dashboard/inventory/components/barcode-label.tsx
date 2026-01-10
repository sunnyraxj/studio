
'use client';

import React from 'react';
import Barcode from 'react-barcode';
import type { InventoryItem } from '../page';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
            className="bg-white text-black flex flex-col items-center justify-between font-sans p-2 border border-black relative" 
            style={{ width: '2.5in', height: '1.5in', boxSizing: 'border-box' }}
        >
            <div className="w-full text-center">
                <p className="text-xs font-bold uppercase truncate">{shopName}</p>
            </div>

            {isQuickBarcode && (
                <div className="absolute top-1/2 -right-6 transform -translate-y-1/2 rotate-90">
                    <Badge variant="destructive" className="text-xs px-2 py-0.5 whitespace-nowrap">
                        Quick
                    </Badge>
                </div>
            )}
            
            <div className="flex flex-col items-center">
                <p className="text-base font-bold truncate max-w-full -mb-1">{item.name}</p>
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
            
            <div className="flex justify-between items-end w-full">
                <div className='text-left text-[10px] space-y-0.5'>
                    {item.size && <div><strong>Size:</strong> {item.size}</div>}
                    {item.expiryDate && <div><strong>Exp:</strong> {format(new Date(item.expiryDate), 'dd/MM/yy')}</div>}
                </div>
                <div className="text-center">
                    <p className="text-lg font-bold uppercase">
                        MRP: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.price || 0)}
                    </p>
                </div>
            </div>
        </div>
    );
};
