
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
    return str.trim();
};


export const Invoice: React.FC<ChallanProps> = ({ sale, settings }) => {
    if (!sale || !settings) {
        return <div className="p-10">Loading challan...</div>;
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
        <div className="bg-white text-black text-[10px] leading-snug p-8 font-sans" style={{width: '210mm', minHeight: '297mm'}}>
            <div className="flex justify-between items-start pb-4 border-b-2 border-black">
                <div className="flex items-center gap-4">
                     {settings.logoUrl && (
                        <div className="relative w-20 h-20">
                            <Image src={settings.logoUrl} alt="Company Logo" layout="fill" objectFit="contain" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold uppercase">{settings.companyName}</h1>
                        <p>{settings.companyAddress}</p>
                        <p>Phone: {settings.companyPhone}</p>
                        <p>GSTIN: {settings.companyGstin}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold uppercase">Delivery Challan</h2>
                    <p><strong>Challan No:</strong> {invoiceNumber}</p>
                    <p><strong>Date:</strong> {format(new Date(date), 'dd-MMM-yyyy')}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-b-2 border-black">
                <div>
                    <h3 className="font-bold mb-1">Billed To:</h3>
                    <p className="font-semibold">{customer.name}</p>
                    <p>{customer.address}</p>
                    <p>{customer.state}, {customer.pin}</p>
                    <p>Phone: {customer.phone}</p>
                    {customer.gstin && <p>GSTIN: {customer.gstin}</p>}
                </div>
                 <div className="text-right">
                    <h3 className="font-bold mb-1">Shipped To:</h3>
                    <p className="font-semibold">{customer.name}</p>
                    <p>{customer.address}</p>
                    <p>{customer.state}, {customer.pin}</p>
                    <p>Phone: {customer.phone}</p>
                </div>
            </div>

            <div className="min-h-[120mm]">
                <table className="w-full my-4">
                    <thead className="bg-gray-200">
                        <tr className="border border-black">
                            <th className="p-1 border-r border-black">#</th>
                            <th className="p-1 border-r border-black text-left">Item Description</th>
                            <th className="p-1 border-r border-black">HSN/SAC</th>
                            <th className="p-1 border-r border-black">Qty</th>
                            <th className="p-1 border-r border-black">Rate</th>
                            <th className="p-1 border-r border-black">Disc(%)</th>
                            <th className="p-1 border-r border-black">Taxable</th>
                            <th className="p-1 border-r border-black">GST(%)</th>
                            <th className="p-1">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                             const itemTotal = item.price * item.quantity;
                             const discountAmount = itemTotal * (item.discount / 100);
                             const taxableValue = itemTotal - discountAmount;
                             const gstAmount = taxableValue * (item.gst / 100);
                             return (
                                <tr key={index} className="border-b border-l border-r border-black">
                                    <td className="p-1 border-r border-black text-center">{index + 1}</td>
                                    <td className="p-1 border-r border-black">{item.name}</td>
                                    <td className="p-1 border-r border-black text-center">{item.hsn || ''}</td>
                                    <td className="p-1 border-r border-black text-center">{item.quantity}</td>
                                    <td className="p-1 border-r border-black text-right">{item.price.toFixed(2)}</td>
                                    <td className="p-1 border-r border-black text-center">{item.discount || 0}%</td>
                                    <td className="p-1 border-r border-black text-right">{taxableValue.toFixed(2)}</td>
                                    <td className="p-1 border-r border-black text-center">{item.gst || 0}%</td>
                                    <td className="p-1 text-right">{(taxableValue + gstAmount).toFixed(2)}</td>
                                </tr>
                             )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2 border-t-2 border-b-2 border-black">
                <div>
                     <p className="capitalize"><strong>Amount in words:</strong> {totalAmountInWords} only</p>
                    {settings.bankName && (
                        <div className="mt-2 border-t border-black pt-2">
                             <h4 className="font-bold">Bank Details:</h4>
                             <p>Bank: {settings.bankName}</p>
                             <p>A/C No: {settings.accountNumber}</p>
                             <p>IFSC: {settings.ifscCode}</p>
                        </div>
                    )}
                </div>
                 <div className="text-right">
                    <div className="grid grid-cols-2">
                        <span className="font-semibold">Subtotal:</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    {cgst > 0 && <div className="grid grid-cols-2"><span className="font-semibold">CGST:</span><span>₹{cgst.toFixed(2)}</span></div>}
                    {sgst > 0 && <div className="grid grid-cols-2"><span className="font-semibold">SGST:</span><span>₹{sgst.toFixed(2)}</span></div>}
                    {igst > 0 && <div className="grid grid-cols-2"><span className="font-semibold">IGST:</span><span>₹{igst.toFixed(2)}</span></div>}
                     <div className="grid grid-cols-2 mt-1 pt-1 border-t border-black font-bold text-base">
                        <span>Total:</span>
                        <span>₹{total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-end pt-4">
                <div>
                    <p className="font-bold mb-1">Terms & Conditions:</p>
                    <p className="text-gray-600">1. Goods once sold will not be taken back.</p>
                    <p className="text-gray-600">2. This is a computer-generated challan.</p>
                </div>
                <div className="text-center">
                    <p className="font-bold border-t border-black pt-2">For {settings.companyName}</p>
                    <p className="mt-12">(Authorized Signatory)</p>
                </div>
            </div>

        </div>
    );
};
