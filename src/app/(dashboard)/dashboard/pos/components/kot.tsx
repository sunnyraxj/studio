
'use client';

import React from 'react';
import { format } from 'date-fns';

type CartItem = {
  product: {
    name: string;
  };
  quantity: number;
};

interface KotProps {
    cart: CartItem[];
    invoiceNumber: string;
    customerName: string;
    instructions?: string;
    tableNumber?: string;
}

export const KOT: React.FC<KotProps> = ({ cart, invoiceNumber, customerName, instructions, tableNumber }) => {
    if (!cart || cart.length === 0) {
        return <div className="p-2 text-center text-xs">No items in order.</div>;
    }

    return (
        <div className="bg-white text-black p-2 font-mono text-xs w-[80mm]">
            <header className="text-center space-y-1 mb-2">
                <h1 className="text-lg font-bold">K.O.T.</h1>
                <div className="text-xs">
                    {tableNumber && <p className="font-bold text-sm">TABLE: {tableNumber}</p>}
                    <p>For: {customerName || 'Walk-in Customer'}</p>
                    <p>Bill #: {invoiceNumber}</p>
                    <p>Time: {format(new Date(), 'hh:mm a')}</p>
                </div>
            </header>
            
            <hr className="my-1 border-dashed border-black" />
            
            <main>
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-dashed border-black">
                            <th className="py-1 text-left font-semibold">ITEM NAME</th>
                            <th className="py-1 text-right font-semibold">QTY</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((item, index) => (
                            <tr key={index}>
                                <td className="py-0.5 text-left uppercase">{item.product.name}</td>
                                <td className="py-0.5 text-right font-bold text-sm">{item.quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
            
            {instructions && (
                <>
                    <hr className="my-1 border-dashed border-black" />
                    <div className="text-xs">
                        <p className="font-bold uppercase">Instructions:</p>
                        <p className="whitespace-pre-wrap">{instructions}</p>
                    </div>
                </>
            )}

            <hr className="my-1 border-dashed border-black" />
        </div>
    );
};
