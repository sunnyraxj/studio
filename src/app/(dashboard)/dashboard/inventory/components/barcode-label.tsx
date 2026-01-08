
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
        <div className="bg-white text-black p-2 flex flex-col items-center justify-center font-sans" style={{ width: '3.5in', height: '1.5in' }}>
            <p className="text-sm font-bold truncate max-w-full">{shopName}</p>
            <Barcode 
                value={item.sku}
                width={2}
                height={50}
                fontSize={14}
                margin={5}
                displayValue={false}
            />
            <p className="text-xs font-semibold tracking-widest">{item.sku}</p>
            <p className="text-lg font-bold">
                MRP: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.price)}
            </p>
        </div>
    );
};
