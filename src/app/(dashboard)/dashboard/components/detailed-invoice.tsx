
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

interface DetailedInvoiceProps {
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


export const DetailedInvoice: React.FC<DetailedInvoiceProps> = ({ sale, settings }) => {
    if (!sale || !settings) {
        return <div className="p-8 text-center">Loading invoice...</div>;
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
        <div className="bg-white text-black p-8 font-sans w-full min-h-full">
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200 mb-6">
                 <div className="flex items-center gap-6">
                     {settings.logoUrl && (
                        <div className="relative w-24 h-24">
                            <Image src={settings.logoUrl} alt="Company Logo" layout="fill" objectFit="contain" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{settings.companyName}</h1>
                        <p className="text-sm text-gray-600 max-w-xs">{settings.companyAddress}</p>
                        {settings.companyPhone && <p className="text-sm text-gray-600">Phone: {settings.companyPhone}</p>}
                        {settings.companyGstin && <p className="text-sm text-gray-600">GSTIN: {settings.companyGstin}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-bold uppercase text-gray-800 tracking-wider">Invoice</h2>
                    <div className="space-y-1 mt-2 text-sm">
                        <p><strong>Invoice No:</strong> {invoiceNumber}</p>
                        <p><strong>Date:</strong> {format(new Date(date), 'dd MMMM, yyyy')}</p>
                    </div>
                </div>
            </header>
            
             <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <h3 className="text-sm font-semibold uppercase text-gray-500 tracking-wider mb-2">Billed To:</h3>
                    <p className="font-bold text-gray-800">{customer.name}</p>
                    {customer.address && <p className="text-sm text-gray-600 max-w-xs">{customer.address}, {customer.state}, {customer.pin}</p>}
                    {customer.phone && <p className="text-sm text-gray-600">Phone: {customer.phone}</p>}
                    {customer.gstin && <p className="text-sm text-gray-600">GSTIN: {customer.gstin}</p>}
                </div>
            </div>

            <main>
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-gray-100 text-xs uppercase text-gray-500 border-y border-gray-300">
                            <th className="p-3 font-semibold">#</th>
                            <th className="p-3 font-semibold">Item & Description</th>
                            <th className="p-3 text-center font-semibold">Qty</th>
                            <th className="p-3 text-right font-semibold">Rate</th>
                            <th className="p-3 text-right font-semibold">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                             const itemTotal = item.price * item.quantity;
                             const discountAmount = itemTotal * (item.discount / 100);
                             const finalPrice = itemTotal - discountAmount;
                             return (
                                <tr key={index} className="border-b border-gray-200">
                                    <td className="p-3">{index + 1}</td>
                                    <td className="p-3">
                                        <p className="font-semibold">{item.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {item.hsn ? `HSN: ${item.hsn}`: ''}
                                            {item.discount > 0 ? ` (Discount: ${item.discount}%)` : ''}
                                        </p>
                                    </td>
                                    <td className="p-3 text-center">{item.quantity} {item.unit || ''}</td>
                                    <td className="p-3 text-right">₹{item.price.toFixed(2)}</td>
                                    <td className="p-3 text-right font-semibold">₹{finalPrice.toFixed(2)}</td>
                                </tr>
                             )
                        })}
                    </tbody>
                </table>
            </main>
            
            <div className="flex justify-between mt-8">
                <div className="w-1/2">
                    <p className="font-semibold">Amount in Words:</p>
                    <p className="text-xs uppercase text-gray-600">{totalAmountInWords} RUPEES ONLY</p>
                </div>
                <div className="w-full max-w-sm space-y-2 text-sm">
                     <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-semibold">₹{subtotal.toFixed(2)}</span></div>
                    {hasTax && (
                        <>
                            {cgst > 0 && <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>₹{cgst.toFixed(2)}</span></div>}
                            {sgst > 0 && <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>₹{sgst.toFixed(2)}</span></div>}
                            {igst > 0 && <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>₹{igst.toFixed(2)}</span></div>}
                             <Separator className="my-1" />
                        </>
                    )}
                     <div className="flex justify-between items-center text-xl font-bold text-gray-800 pt-2 border-t-2 border-gray-300">
                        <span>Grand Total</span>
                        <span>₹{total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <footer className="mt-12 pt-6 border-t-2 border-gray-300 text-xs">
                 <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-4">
                        {settings.bankName && (
                            <div className="space-y-1 pt-4">
                                <h4 className="text-sm font-semibold uppercase text-gray-500 tracking-wider">Payment Information</h4>
                                <div className="text-gray-600">
                                     <p><strong>Bank:</strong> {settings.bankName}</p>
                                     <p><strong>A/C Name:</strong> {settings.companyName}</p>
                                     <p><strong>A/C No:</strong> {settings.accountNumber}</p>
                                     <p><strong>IFSC:</strong> {settings.ifscCode}</p>
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="text-right flex flex-col justify-between items-end">
                        <div>
                            <p className="font-bold">For {settings.companyName}</p>
                        </div>
                        <div className="pt-24">
                            <p className="border-t border-gray-400 pt-2">Authorised Signatory</p>
                        </div>
                    </div>
                </div>
                 <div className="text-center mt-8 text-gray-500">
                    <p>Thank you for your business!</p>
                </div>
            </footer>
        </div>
    );
};
