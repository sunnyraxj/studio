'use client';

import React from 'react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { IndianRupee } from 'lucide-react';

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

    const hasGstin = !!settings.companyGstin;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="bg-white text-black font-mono text-[10px] w-full px-2 py-4">
            <header className="text-center space-y-1 mb-2">
                <h1 className="text-base font-bold">{settings.companyName}</h1>
                <p className="text-[9px] leading-tight">{settings.companyAddress}</p>
                {settings.companyPhone && <p className="text-[9px]">Phone: {settings.companyPhone}</p>}
                {hasGstin && settings.companyGstin && <p className="text-[9px]">GSTIN: {settings.companyGstin}</p>}
            </header>
            
            <Separator className="my-0.5 border-dashed" />
            
            <div className="text-[9px] space-y-0.5 mb-2">
                <div className="flex justify-between">
                    <span>BILL NO: {invoiceNumber}</span>
                    <span>DATE: {format(new Date(date), 'dd/MM/yy HH:mm')}</span>
                </div>
                 <div className="flex justify-between">
                    <span>CUSTOMER: {customer.name}</span>
                    {paymentMode !== 'both' && (
                        <span className="flex items-center gap-1">
                            <span className="uppercase">{paymentMode}</span>: <IndianRupee className="h-2.5 w-2.5" />{total.toFixed(2)}
                        </span>
                    )}
                </div>
                {paymentMode === 'both' && paymentDetails && (
                    <div className="pt-1">
                        {paymentDetails.cash && paymentDetails.cash > 0 && <div className="flex justify-between items-center"><span>Cash Paid:</span><span className="flex items-center gap-1"><IndianRupee className="h-2.5 w-2.5" />{paymentDetails.cash.toFixed(2)}</span></div>}
                        {paymentDetails.card && paymentDetails.card > 0 && <div className="flex justify-between items-center"><span>Card Paid:</span><span className="flex items-center gap-1"><IndianRupee className="h-2.5 w-2.5" />{paymentDetails.card.toFixed(2)}</span></div>}
                        {paymentDetails.upi && paymentDetails.upi > 0 && <div className="flex justify-between items-center"><span>UPI Paid:</span><span className="flex items-center gap-1"><IndianRupee className="h-2.5 w-2.5" />{paymentDetails.upi.toFixed(2)}</span></div>}
                    </div>
                )}
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
                        {items.map((item, index) => {
                             const itemTotal = item.price * item.quantity;
                             const discountAmount = itemTotal * (item.discount / 100);
                             const finalPrice = itemTotal - discountAmount;
                             return (
                                <tr key={index}>
                                    <td className="py-0.5 text-left uppercase">{item.name}</td>
                                    <td className="py-0.5 text-center">{item.quantity}</td>
                                    <td className="py-0.5 text-right">{item.price.toFixed(2)}</td>
                                    <td className="py-0.5 text-right">{finalPrice.toFixed(2)}</td>
                                </tr>
                             )
                        })}
                    </tbody>
                </table>
            </main>
            
            <Separator className="my-0.5 border-dashed" />

            <div className="text-[9px] space-y-0.5">
                 {hasGstin && (
                    <>
                        <div className="flex justify-between"><span>SUBTOTAL (Taxable)</span><span>{subtotal.toFixed(2)}</span></div>
                        {cgst > 0 && <div className="flex justify-between"><span>CGST</span><span>{cgst.toFixed(2)}</span></div>}
                        {sgst > 0 && <div className="flex justify-between"><span>SGST</span><span>{sgst.toFixed(2)}</span></div>}
                        {igst > 0 && <div className="flex justify-between"><span>IGST</span><span>{igst.toFixed(2)}</span></div>}
                    </>
                 )}
                 <div className="flex justify-between font-bold text-xs border-t border-dashed pt-1 items-center">
                    <span>GRAND TOTAL</span>
                    <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{total.toFixed(2)}</span>
                </div>
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
