
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
            className="bg-white text-black flex flex-col items-center justify-center font-sans p-1" 
            style={{ width: '2.5in', height: '1.5in', boxSizing: 'border-box' }}
        >
            <p className="text-[10px] font-bold uppercase truncate max-w-full">{shopName}</p>
            <p className="text-xs font-bold truncate max-w-full mb-0.5">{item.name}</p>
            <Barcode 
                value={item.sku}
                width={1.2}
                height={30}
                fontSize={10}
                margin={2}
                displayValue={false}
            />
            <p className="text-[9px] font-bold tracking-widest uppercase -mt-1">{item.sku}</p>
            <div className="flex justify-between items-center w-full px-2 mt-0.5">
              {item.size && <p className="text-sm font-bold uppercase">Size: {item.size}</p>}
              <p className="text-base font-bold uppercase ml-auto">
                  MRP: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.price)}
              </p>
            </div>
        </div>
    );
};

