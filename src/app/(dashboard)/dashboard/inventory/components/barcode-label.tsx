
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
            className="bg-white text-black flex flex-col items-center justify-center font-sans p-1 border border-black relative font-extrabold" 
            style={{ width: '2.5in', height: '1.5in', boxSizing: 'border-box' }}
        >
            <div className="w-full flex justify-center items-center relative">
                <p className="text-xs uppercase">{shopName}</p>
                {isQuickBarcode && (
                    <span className="absolute right-0 text-[8px] uppercase">Quick</span>
                )}
            </div>
            
            <div className="w-full flex-grow flex flex-col justify-center items-center gap-0">
                 <p className="text-base truncate max-w-full mb-1">{item.name}</p>
                 <div className="w-full flex justify-between items-start">
                    <div className="text-left">
                         <p className="text-lg flex items-center">
                            <IndianRupee className="h-4 w-4 mr-0.5" />
                            {(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                     <div className='text-right text-[10px] flex items-center gap-x-2'>
                        {item.size && <div>Size: {item.size}</div>}
                        {item.expiryDate && <div>Expiry: {format(new Date(item.expiryDate), 'd/M/yy')}</div>}
                    </div>
                </div>

                <div className="flex flex-col items-center -my-2">
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
        </div>
    );
};
