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


export const Invoice: React.FC<InvoiceProps> = ({ sale, settings }) => {
    if (!sale || !settings) {
        return <div className="p-10 text-center">Loading invoice...</div>;
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

    return (
        <div className="bg-white text-gray-800 text-sm p-10 font-sans" style={{width: '210mm', minHeight: '297mm'}}>
            <header className="flex justify-between items-center pb-6 border-b-2 border-gray-200">
                <div className="flex items-center gap-6">
                     {settings.logoUrl && (
                        <div className="relative w-24 h-24">
                            <Image src={settings.logoUrl} alt="Company Logo" layout="fill" objectFit="contain" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 uppercase tracking-wider">{settings.companyName}</h1>
                        <p className="text-xs text-gray-500 max-w-xs">{settings.companyAddress}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold uppercase text-primary">Invoice</h2>
                    <div className="space-y-1 mt-2">
                        <p className="text-xs"><strong>Invoice No:</strong> {invoiceNumber}</p>
                        <p className="text-xs"><strong>Date:</strong> {format(new Date(date), 'dd MMMM, yyyy')}</p>
                        {settings.companyGstin && <p className="text-xs"><strong>GSTIN:</strong> {settings.companyGstin}</p>}
                        {settings.companyPhone && <p className="text-xs"><strong>Phone:</strong> {settings.companyPhone}</p>}
                    </div>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-8 py-6 border-b-2 border-gray-200">
                <div>
                    <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">Billed To:</h3>
                    <p className="font-bold text-base text-gray-800">{customer.name}</p>
                    {customer.address && <p className="text-xs text-gray-600 max-w-xs">{customer.address}, {customer.state}, {customer.pin}</p>}
                    {customer.phone && <p className="text-xs text-gray-600">Phone: {customer.phone}</p>}
                    {customer.gstin && <p className="text-xs text-gray-600">GSTIN: {customer.gstin}</p>}
                </div>
                 <div className="text-right">
                    <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">Shipped To:</h3>
                    <p className="font-bold text-base text-gray-800">{customer.name}</p>
                    {customer.address && <p className="text-xs text-gray-600 max-w-xs ml-auto">{customer.address}, {customer.state}, {customer.pin}</p>}
                 </div>
            </section>

            <main className="min-h-[110mm] py-6">
                <table className="w-full">
                    <thead className="border-b border-gray-300">
                        <tr className="text-xs uppercase text-gray-500">
                            <th className="py-2 text-left font-semibold w-8">#</th>
                            <th className="py-2 text-left font-semibold">Item</th>
                            <th className="py-2 text-center font-semibold w-20">HSN/SAC</th>
                            <th className="py-2 text-center font-semibold w-16">Qty</th>
                            <th className="py-2 text-right font-semibold w-24">Rate</th>
                            <th className="py-2 text-right font-semibold w-24">Taxable</th>
                            <th className="py-2 text-right font-semibold w-32">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                             const itemTotal = item.price * item.quantity;
                             const discountAmount = itemTotal * (item.discount / 100);
                             const taxableValue = itemTotal - discountAmount;
                             const gstAmount = taxableValue * (item.gst / 100);
                             return (
                                <tr key={index} className="border-b border-gray-100">
                                    <td className="py-3 text-center text-xs">{index + 1}</td>
                                    <td className="py-3">
                                        <p className="font-semibold text-sm">{item.name}</p>
                                        <p className="text-xs text-gray-500">{item.discount > 0 ? `(Disc: ${item.discount}%)` : ''}</p>
                                    </td>
                                    <td className="py-3 text-center text-xs">{item.hsn || ''}</td>
                                    <td className="py-3 text-center text-sm">{item.quantity}</td>
                                    <td className="py-3 text-right text-sm">₹{item.price.toFixed(2)}</td>
                                    <td className="py-3 text-right text-sm">₹{taxableValue.toFixed(2)}</td>
                                    <td className="py-3 text-right text-sm font-semibold">₹{(taxableValue + gstAmount).toFixed(2)}</td>
                                </tr>
                             )
                        })}
                    </tbody>
                </table>
            </main>

            <footer className="pt-6">
                 <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="space-y-1">
                             <h4 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Amount in Words</h4>
                             <p className="font-semibold text-xs">{totalAmountInWords} RUPEES ONLY</p>
                        </div>
                        
                        {settings.bankName && (
                            <div className="space-y-1 pt-4 border-t border-gray-200">
                                <h4 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Bank Details</h4>
                                <div className="text-xs">
                                     <p><strong>Bank:</strong> {settings.bankName}</p>
                                     <p><strong>A/C No:</strong> {settings.accountNumber}</p>
                                     <p><strong>IFSC:</strong> {settings.ifscCode}</p>
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="text-right">
                        <div className="space-y-2">
                             <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal:</span><span className="font-semibold">₹{subtotal.toFixed(2)}</span></div>
                            {cgst > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">CGST:</span><span>₹{cgst.toFixed(2)}</span></div>}
                            {sgst > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">SGST:</span><span>₹{sgst.toFixed(2)}</span></div>}
                            {igst > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">IGST:</span><span>₹{igst.toFixed(2)}</span></div>}
                        </div>
                         <Separator className="my-3" />
                         <div className="flex justify-between items-center text-xl font-bold text-primary">
                            <span>Total:</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-6 border-t-2 border-gray-200 flex justify-between items-end">
                    <div className="text-xs text-gray-500">
                        <p className="font-semibold mb-1">Terms & Conditions:</p>
                        <p>1. Goods once sold will not be taken back.</p>
                        <p>2. This is a computer-generated invoice and does not require a signature.</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-sm">For {settings.companyName}</p>
                        <p className="mt-16 text-xs text-gray-500">(Authorized Signatory)</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
