'use client';

import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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

interface ChallanProps {
    sale: Sale | null;
    settings: ShopSettings | null;
}

const numberToWords = (num: number): string => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if ((num = Math.round(num)).toString().length > 9) return 'overflow';
    let n: any = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != '00') ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != '00') ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != '00') ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != '0') ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != '00') ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim().toUpperCase();
};


export const Invoice: React.FC<ChallanProps> = ({ sale, settings }) => {
    if (!sale || !settings) {
        return <div className="p-10 text-center">Loading challan...</div>;
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
    } = sale;

    const totalAmountInWords = numberToWords(total);
    const hasTax = cgst > 0 || sgst > 0 || igst > 0;

    return (
        <div className="bg-white text-gray-800 text-sm p-10 font-sans" style={{width: '210mm', minHeight: '297mm'}}>
            <header className="flex justify-between items-start pb-6 mb-8">
                 <div className="flex items-center gap-4">
                     {settings.logoUrl && (
                        <div className="relative w-20 h-20">
                            <Image src={settings.logoUrl} alt="Company Logo" layout="fill" objectFit="contain" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">Billed To:</h3>
                        <p className="font-bold text-base text-gray-800">{customer.name}</p>
                        {customer.phone && <p className="text-xs text-gray-600">Phone: {customer.phone}</p>}
                        {customer.address && <p className="text-xs text-gray-600 max-w-xs">{customer.address}, {customer.state}, {customer.pin}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-bold uppercase text-gray-900 tracking-wider">Delivery Challan</h2>
                    <div className="space-y-1 mt-4 text-xs">
                        <p><strong>Challan No:</strong> {invoiceNumber}</p>
                        <p><strong>Date:</strong> {format(new Date(date), 'dd MMMM, yyyy')}</p>
                    </div>
                </div>
            </header>
            
            <Separator className="my-8" />

            <main className="min-h-[110mm]">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-xs uppercase text-gray-500 border-b border-gray-300">
                            <th className="py-2 font-semibold">Item</th>
                            <th className="py-2 text-center font-semibold w-24">Qty</th>
                            <th className="py-2 text-right font-semibold w-32">Rate</th>
                            <th className="py-2 text-right font-semibold w-32">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                             const itemTotal = item.price * item.quantity;
                             const discountAmount = itemTotal * (item.discount / 100);
                             const finalPrice = itemTotal - discountAmount;
                             return (
                                <tr key={index} className="border-b border-gray-200">
                                    <td className="py-3">
                                        <p className="font-semibold text-sm">{item.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {item.hsn ? `HSN: ${item.hsn}`: ''}
                                            {item.discount > 0 ? ` (Disc: ${item.discount}%)` : ''}
                                        </p>
                                    </td>
                                    <td className="py-3 text-center text-sm">{item.quantity}</td>
                                    <td className="py-3 text-right text-sm">₹{item.price.toFixed(2)}</td>
                                    <td className="py-3 text-right text-sm font-semibold">₹{finalPrice.toFixed(2)}</td>
                                </tr>
                             )
                        })}
                    </tbody>
                </table>
            </main>
            
            <div className="flex justify-end mt-8">
                <div className="w-full max-w-sm space-y-3">
                     <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-semibold">₹{subtotal.toFixed(2)}</span></div>
                    {hasTax && (
                        <>
                            {cgst > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">CGST</span><span>₹{cgst.toFixed(2)}</span></div>}
                            {sgst > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">SGST</span><span>₹{sgst.toFixed(2)}</span></div>}
                            {igst > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">IGST</span><span>₹{igst.toFixed(2)}</span></div>}
                        </>
                    )}
                     <Separator className="my-2" />
                     <div className="flex justify-between items-center text-xl font-bold text-primary">
                        <span>Total Due</span>
                        <span>₹{total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <footer className="mt-16 pt-8 border-t-2 border-gray-300">
                 <div className="flex justify-between items-start">
                     <div className="space-y-4 max-w-md">
                        <h4 className="text-lg font-semibold text-gray-800">Thank you for your business!</h4>
                        
                        {settings.bankName && (
                            <div className="space-y-1 pt-2">
                                <h4 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Payment Information</h4>
                                <div className="text-xs">
                                     <p><strong>Bank:</strong> {settings.bankName}</p>
                                     <p><strong>A/C Name:</strong> {settings.companyName}</p>
                                     <p><strong>A/C No:</strong> {settings.accountNumber}</p>
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="text-right">
                        <p className="font-bold text-base">{settings.companyName}</p>
                        <p className="text-xs text-gray-600 max-w-xs ml-auto">{settings.companyAddress}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
