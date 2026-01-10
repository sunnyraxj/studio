
'use client';

import React from 'react';
import Barcode from 'react-barcode';
import type { InventoryItem } from '../page';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { IndianRupee } from 'lucide-react';

interface BarcodeLabelProps {
    item: Partial<InventoryItem>;
    shopName: string;
    isQuickBarcode?: boolean;
}

export const BarcodeLabel: React.FC<BarcodeLabelProps> = ({ item, shopName, isQuickBarcode = false }) => {
    if (!item.sku && !isQuickBarcode) {
        // Allow printing for quick barcodes even without SKU
    }

    return (
        <div 
            className="bg-white text-black flex flex-col items-center justify-between font-sans p-1 border border-black relative font-extrabold" 
            style={{ width: '2.5in', height: '1.5in', boxSizing: 'border-box' }}
        >
            <div className="w-full flex justify-center items-center relative">
                <p className="text-xs uppercase">{shopName}</p>
                {isQuickBarcode && (
                    <span className="absolute right-0 text-[8px] uppercase font-bold">Quick</span>
                )}
            </div>
            
            <div className="w-full flex-grow flex flex-col justify-center items-center gap-0">
                 <p className="text-base truncate max-w-full mb-1">{item.name}</p>
                <div className="flex flex-col items-center">
                    <Barcode 
                        value={item.sku || 'N/A'}
                        width={1.2}
                        height={30}
                        fontSize={10}
                        margin={2}
                        displayValue={true}
                        fontOptions="bold"
                    />
                </div>
            </div>
            <div className='text-[10px] flex items-center justify-between w-full px-1'>
                <div className="flex items-center">
                    MRP: <IndianRupee className="h-3 w-3 mx-0.5" />
                    {(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {item.size && <div>Size: {item.size}</div>}
                {item.expiryDate && <div>Expiry: {format(new Date(item.expiryDate), 'd/M/yy')}</div>}
            </div>
        </div>
    );
};
