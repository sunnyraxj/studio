'use client';

import React from 'react';
import Barcode from 'react-barcode';
import type { InventoryItem } from '../page';

interface BarcodeLabelProps {
    item: InventoryItem;
    shopName: string;
}

export const BarcodeLabel: React.FC<BarcodeLabelProps> = ({ item, shopName }) => {
    if (!item.sku) {
        return <div className="p-4 text-center text-red-500">SKU is required to generate a barcode.</div>;
    }

    return (
        <div 
            className="bg-white text-black flex flex-col items-center justify-center font-sans" 
            style={{ width: '2.5in', height: '1.5in', boxSizing: 'border-box', padding: '0.1in' }}
        >
            <p className="text-xs font-bold truncate max-w-full">{shopName}</p>
            <Barcode 
                value={item.sku}
                width={1.4}
                height={35}
                fontSize={12}
                margin={2}
                displayValue={false}
            />
            <p className="text-[10px] font-semibold tracking-widest">{item.sku}</p>
            <p className="text-base font-bold">
                MRP: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.price)}
            </p>
        </div>
    );
};
