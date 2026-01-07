'use client';

import React from 'react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

type ShopSettings = {
    companyName?: string;
    companyAddress?: string;
    companyGstin?: string;
    companyPhone?: string;
    logoUrl?: string;
    upiId?: string;
}

type Sale = {
  date: string;
  total: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  items: any[];
  customer: {
    name: string;
  };
  invoiceNumber: string;
  paymentMode: string;
  paymentDetails?: {
    cash?: number;
    card?: number;
    upi?: number;
  }
};

interface CompactReceiptProps {
    sale: Sale | null;
    settings: ShopSettings | null;
}

export const CompactReceipt: React.FC<CompactReceiptProps> = ({ sale, settings }) => {
    if (!sale || !settings) {
        return <div className="p-2 text-center text-xs">Loading receipt...</div>;
    }
    
    const {
        invoiceNumber,
        date,
        customer,
        items,
        subtotal,
        cgst,
        sgst,
        igst,
        total,
        paymentMode,
        paymentDetails
    } = sale;

    const hasTax = cgst > 0 || sgst > 0 || igst > 0;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="bg-white text-black font-mono text-[10px] w-full p-2">
            <header className="text-center space-y-1 mb-2">
                <h1 className="text-base font-bold">{settings.companyName}</h1>
                <p className="text-[9px] leading-tight">{settings.companyAddress}</p>
                {settings.companyPhone && <p className="text-[9px]">Phone: {settings.companyPhone}</p>}
                {settings.companyGstin && <p className="text-[9px]">GSTIN: {settings.companyGstin}</p>}
            </header>
            
            <Separator className="my-0.5 border-dashed" />
            
            <div className="text-[9px] space-y-0.5 mb-2">
                <div className="flex justify-between">
                    <span>BILL NO: {invoiceNumber}</span>
                    <span>DATE: {format(new Date(date), 'dd/MM/yy HH:mm')}</span>
                </div>
                <p>CUSTOMER: {customer.name}</p>
            </div>
            
            <main>
                <table className="w-full text-[9px]">
                    <thead>
                        <tr className="border-t border-b border-dashed">
                            <th className="py-1 text-left font-normal">ITEM</th>
                            <th className="py-1 text-center font-normal">QTY</th>
                            <th className="py-1 text-right font-normal">RATE</th>
                            <th className="py-1 text-right font-normal">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td className="py-0.5 text-left uppercase">{item.name}</td>
                                <td className="py-0.5 text-center">{item.quantity}</td>
                                <td className="py-0.5 text-right">{item.price.toFixed(2)}</td>
                                <td className="py-0.5 text-right">{(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
            
            <Separator className="my-0.5 border-dashed" />

            <div className="text-[9px] space-y-0.5">
                 <div className="flex justify-between"><span>SUBTOTAL</span><span>{subtotal.toFixed(2)}</span></div>
                {hasTax && (
                    <>
                        {cgst > 0 && <div className="flex justify-between"><span>CGST</span><span>{cgst.toFixed(2)}</span></div>}
                        {sgst > 0 && <div className="flex justify-between"><span>SGST</span><span>{sgst.toFixed(2)}</span></div>}
                        {igst > 0 && <div className="flex justify-between"><span>IGST</span><span>{igst.toFixed(2)}</span></div>}
                    </>
                )}
                 <div className="flex justify-between font-bold text-xs border-t border-dashed pt-1">
                    <span>GRAND TOTAL</span>
                    <span>₹{total.toFixed(2)}</span>
                </div>
            </div>

            <Separator className="my-0.5 border-dashed" />

            <div className="text-[9px] space-y-0.5">
                <div className="flex justify-between font-semibold">
                    <span>PAYMENT MODE:</span>
                    <span className="uppercase">{paymentMode}</span>
                </div>
                {paymentMode === 'both' && paymentDetails && (
                    <>
                        {paymentDetails.cash && paymentDetails.cash > 0 && <div className="flex justify-between pl-2"><span>Cash:</span><span>₹{paymentDetails.cash.toFixed(2)}</span></div>}
                        {paymentDetails.card && paymentDetails.card > 0 && <div className="flex justify-between pl-2"><span>Card:</span><span>₹{paymentDetails.card.toFixed(2)}</span></div>}
                        {paymentDetails.upi && paymentDetails.upi > 0 && <div className="flex justify-between pl-2"><span>UPI:</span><span>₹{paymentDetails.upi.toFixed(2)}</span></div>}
                    </>
                )}
            </div>

            <Separator className="my-2 border-dashed" />

            <footer className="text-center text-[9px] space-y-1">
                <p>TOTAL ITEMS: {totalItems}</p>
                <p>THANK YOU FOR YOUR BUSINESS!</p>
                <p>*** VISIT AGAIN ***</p>
            </footer>
        </div>
    );
};
