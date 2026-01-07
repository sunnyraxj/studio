'use client';

import React, { useMemo } from 'react';
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
    return str.trim().split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ') + ' Only';
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
        total,
    } = sale;

    const amountInWords = numberToWords(total);
    
    const shopState = (settings.companyState || 'Assam').toLowerCase().trim();
    const customerStateClean = (customer.state || '').toLowerCase().trim();
    const isIntraState = customerStateClean === shopState;

    const cgst = isIntraState ? sale.cgst : 0;
    const sgst = isIntraState ? sale.sgst : 0;
    const igst = !isIntraState ? sale.igst : 0;
    
    const gstBreakdown = useMemo(() => {
        const breakdown: { [rate: number]: { taxable: number; cgst: number; sgst: number; igst: number } } = {};

        items.forEach(item => {
            const gstRate = item.gst || 0;
            if (!breakdown[gstRate]) {
                breakdown[gstRate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
            }
            const itemTotal = item.price * item.quantity;
            const discountAmount = itemTotal * (item.discount / 100);
            const taxableValue = itemTotal - discountAmount;
            const taxAmount = taxableValue * (gstRate / 100);

            breakdown[gstRate].taxable += taxableValue;

            if (isIntraState) {
                breakdown[gstRate].cgst += taxAmount / 2;
                breakdown[gstRate].sgst += taxAmount / 2;
            } else {
                breakdown[gstRate].igst += taxAmount;
            }
        });

        return Object.entries(breakdown).map(([rate, values]) => ({
            rate: Number(rate),
            ...values,
        }));
    }, [items, isIntraState]);

    return (
        <div className="bg-white text-black p-8 font-sans w-full min-h-full" id="invoice-print">
            <div className="relative z-10">
                <header className="pb-6 border-b-2 border-gray-700">
                    <div className="flex justify-between items-start">
                        {settings.logoUrl && (
                            <Image src={settings.logoUrl} alt={`${settings.companyName} logo`} className="h-16 w-auto" width={64} height={64} />
                        )}
                        <div className="text-center flex-grow">
                            <h2 className="text-3xl font-bold text-primary uppercase">Tax Invoice</h2>
                            <p className="text-sm font-bold text-gray-900"><strong>Invoice No:</strong> {invoiceNumber}</p>
                            <p className="text-sm font-bold text-gray-900"><strong>Date:</strong> {format(new Date(date), 'd/M/yyyy')}</p>
                        </div>
                        <div className="w-16"></div> {/* Spacer */}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 mt-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold text-gray-800">{settings.companyName}</h1>
                            <p className="text-sm text-gray-600 max-w-xs">{settings.companyAddress}</p>
                            <p className="text-sm text-gray-600">GSTIN: {settings.companyGstin}</p>
                            <p className="text-sm text-gray-600">State: {settings.companyState}</p>
                            <p className="text-sm text-gray-600">Contact: {settings.companyPhone}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <h3 className="font-bold text-gray-700 mb-1">Bill To:</h3>
                            <p className="font-semibold text-gray-800 text-base">{customer.name}</p>
                            <p className="text-sm text-gray-600">{customer.address}</p>
                            {customer.state && customer.pin && (
                                <p className="text-sm text-gray-600">{customer.state} - {customer.pin}</p>
                            )}
                            {customer.phone && <p className="text-sm text-gray-600">Phone: {customer.phone}</p>}
                            {customer.gstin && <p className="text-sm text-gray-600">GSTIN: {customer.gstin}</p>}
                            {sale.paymentMode && <p className="text-sm text-gray-600 mt-1"><strong>Payment Mode:</strong> {sale.paymentMode}</p>}
                        </div>
                    </div>
                </header>

                <section className="my-8">
                    <table className="w-full text-sm">
                        <thead className="bg-primary text-primary-foreground print-color-exact">
                            <tr>
                                <th className="text-left font-semibold p-2">#</th>
                                <th className="text-left font-semibold p-2">Product</th>
                                <th className="text-left font-semibold p-2">HSN</th>
                                <th className="text-right font-semibold p-2">Qty</th>
                                <th className="text-right font-semibold p-2">Rate</th>
                                <th className="text-right font-semibold p-2">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => {
                                const itemTotal = item.price * item.quantity;
                                const discountAmount = itemTotal * (item.discount / 100);
                                const finalPrice = itemTotal - discountAmount;
                                return (
                                    <tr key={index} className="border-b border-gray-100">
                                        <td className="p-2">{index + 1}</td>
                                        <td className="p-2 font-medium text-gray-800">{item.name}</td>
                                        <td className="p-2">{item.hsn}</td>
                                        <td className="text-right p-2">{item.quantity}</td>
                                        <td className="text-right p-2">{item.price.toFixed(2)}</td>
                                        <td className="text-right p-2 font-semibold">{finalPrice.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
                
                 <section className="my-8 flex justify-between gap-4">
                     <div className="w-full sm:w-1/2">
                         {gstBreakdown.length > 0 && (
                            <>
                                <h4 className="font-bold text-sm mb-2">Tax Summary</h4>
                                <table className="w-full text-xs border">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="text-left font-semibold p-1 border">Taxable Value</th>
                                            {isIntraState ? (
                                                <>
                                                    <th className="text-left font-semibold p-1 border">CGST</th>
                                                    <th className="text-left font-semibold p-1 border">SGST</th>
                                                </>
                                            ) : (
                                                <th className="text-left font-semibold p-1 border">IGST</th>
                                            )}
                                            <th className="text-right font-semibold p-1 border">Total Tax</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gstBreakdown.map(({ rate, taxable, cgst, sgst, igst }) => (
                                            <tr key={rate}>
                                                <td className="p-1 border">₹{taxable.toFixed(2)}</td>
                                                {isIntraState ? (
                                                    <>
                                                        <td className="p-1 border">@{rate/2}% ₹{cgst.toFixed(2)}</td>
                                                        <td className="p-1 border">@{rate/2}% ₹{sgst.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <td className="p-1 border">@{rate}% ₹{igst.toFixed(2)}</td>
                                                )}
                                                <td className="text-right p-1 border font-semibold">₹{(cgst + sgst + igst).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                         )}
                    </div>

                    <div className="w-full sm:w-2/5">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium text-gray-800 text-right">₹{subtotal.toFixed(2)}</span>
                            
                            {cgst > 0 && (
                                <>
                                    <span className="text-gray-600">CGST:</span>
                                    <span className="font-medium text-gray-800 text-right">₹{cgst.toFixed(2)}</span>
                                </>
                            )}
                            {sgst > 0 && (
                                <>
                                    <span className="text-gray-600">SGST:</span>
                                    <span className="font-medium text-gray-800 text-right">₹{sgst.toFixed(2)}</span>
                                </>
                            )}
                            {igst > 0 && (
                                <>
                                    <span className="text-gray-600">IGST:</span>
                                    <span className="font-medium text-gray-800 text-right">₹{igst.toFixed(2)}</span>
                                </>
                            )}
                        </div>
                        <div className="pt-4 mt-4 border-t-2 border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xl font-bold text-gray-900">Total:</span>
                                <span className="text-xl font-bold text-gray-900">₹{total.toFixed(2)}</span>
                            </div>
                            <div className="text-right text-xs mt-6">
                                <p className="font-bold">Amount in words:</p>
                                <p className="text-gray-600">{amountInWords}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="mt-16 text-sm text-gray-500 border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-start gap-4">
                       {settings.bankName && (
                            <div className='text-sm text-gray-900 flex-1'>
                                <p className="font-bold text-base text-gray-800">Bank Details:</p>
                                <div className="text-gray-700 text-sm font-bold space-y-0.5">
                                  {settings.companyName && <p><strong>Holder:</strong> {settings.companyName}</p>}
                                  {settings.accountNumber && <p><strong>A/C No:</strong> {settings.accountNumber}</p>}
                                  {settings.bankName && <p><strong>Bank:</strong> {settings.bankName}</p>}
                                  {settings.ifscCode && <p><strong>IFSC:</strong> {settings.ifscCode}</p>}
                                </div>
                            </div>
                        )}
                       <div className="text-center flex-1 ml-auto w-56">
                           <p className="font-semibold">For, {settings.companyName}</p>
                           <div className="h-20"></div> {/* Space for stamp/signature */}
                           <p className="font-semibold">Authorised Signatory</p>
                       </div>
                   </div>
                   <div className="mt-8 text-center">
                     <p className="italic font-semibold text-gray-700 mt-1">Handmade with care, inspired by nature.</p>
                   </div>
               </footer>
            </div>
        </div>
    );
};
