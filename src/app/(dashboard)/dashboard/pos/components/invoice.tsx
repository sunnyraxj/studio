
'use client';

import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

type ShopSettings = {
    companyName?: string;
    companyAddress?: string;
    companyGstin?: string;
    companyPhone?: string;
    logoUrl?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    companyState?: string;
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
    phone?: string;
    address?: string;
    pin?: string;
    state?: string;
    gstin?: string;
  };
  paymentMode: string;
  invoiceNumber: string;
  paymentDetails?: {
    cash?: number;
    card?: number;
    upi?: number;
  }
};

interface InvoiceProps {
    sale: Sale | null;
    settings: ShopSettings | null;
}

export const Invoice: React.FC<InvoiceProps> = ({ sale, settings }) => {
    if (!sale || !settings) {
        return <div className="p-4 text-center">Loading invoice...</div>;
    }
    
    const {
        invoiceNumber,
        date,
        items,
        subtotal,
        total,
    } = sale;
    
    const isIntraState = sale.customer.state?.toLowerCase().trim() === settings.companyState?.toLowerCase().trim();
    const cgst = isIntraState ? sale.cgst : 0;
    const sgst = isIntraState ? sale.sgst : 0;
    const igst = !isIntraState ? sale.igst : 0;

    return (
        <div className="bg-white text-black p-2 font-mono text-[10px] w-full min-h-full">
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
                <p>CUSTOMER: {sale.customer.name}</p>
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
                <div className="flex justify-between"><span>SUBTOTAL</span><span>{subtotal.toFixed(2)}</span></div>
                {cgst > 0 && <div className="flex justify-between"><span>CGST</span><span>{cgst.toFixed(2)}</span></div>}
                {sgst > 0 && <div className="flex justify-between"><span>SGST</span><span>{sgst.toFixed(2)}</span></div>}
                {igst > 0 && <div className="flex justify-between"><span>IGST</span><span>{igst.toFixed(2)}</span></div>}

                 <div className="flex justify-between font-bold text-xs border-t border-dashed pt-1">
                    <span>GRAND TOTAL</span>
                    <span>₹{total.toFixed(2)}</span>
                </div>
            </div>

            <Separator className="my-2 border-dashed" />

            <footer className="text-center text-[9px] space-y-1">
                <p>TOTAL ITEMS: {items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                <p>THANK YOU FOR YOUR BUSINESS!</p>
                <p>*** VISIT AGAIN ***</p>
            </footer>
        </div>
    );
};

    