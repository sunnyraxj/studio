
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
        return <div className="p-4 text-center text-red-500">SKU is required to generate a barcode.</div>;
    }

    return (
        <div 
            className="bg-white text-black flex flex-col items-center justify-between font-sans p-2 border border-black relative" 
            style={{ width: '2.5in', height: '1.5in', boxSizing: 'border-box' }}
        >
            <div className="w-full flex justify-between items-center">
                <div className="flex-1 text-center">
                    <p className="text-xs font-bold uppercase truncate">{shopName}</p>
                </div>
                {isQuickBarcode && (
                    <Badge variant="destructive" className="text-[8px] px-1 py-0 ml-1 whitespace-nowrap">
                        Quick
                    </Badge>
                )}
            </div>
            
            <div className="w-full flex-grow flex flex-col justify-center items-center">
                 <div className="w-full flex justify-between items-start -mb-1">
                    <div className="text-left">
                         <p className="text-base font-bold flex items-center">
                            <IndianRupee className="h-4 w-4 mr-0.5" />
                            {(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                     <div className='text-right text-[10px] space-y-0.5'>
                        {item.size && <div><strong>Size:</strong> {item.size}</div>}
                        {item.expiryDate && <div><strong>Exp:</strong> {format(new Date(item.expiryDate), 'dd/MM/yy')}</div>}
                    </div>
                </div>

                <div className="flex flex-col items-center">
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
            </div>
            
            <div className="w-full text-center">
                <p className="text-base font-bold truncate max-w-full">{item.name}</p>
            </div>
        </div>
    );
};
