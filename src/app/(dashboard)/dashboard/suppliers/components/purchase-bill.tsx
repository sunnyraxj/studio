'use client';

import React from 'react';
import { format } from 'date-fns';
import { IndianRupee } from 'lucide-react';

type Supplier = {
  id: string;
  name: string;
  category: string;
  phone?: string;
  email?: string;
  address?: string;
};

type Purchase = {
  id: string;
  billNumber?: string;
  billDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'Paid' | 'Unpaid' | 'Partially Paid';
  items: { itemName: string; quantity: number; rate: number }[];
};

interface PurchaseBillProps {
    purchase: Purchase;
    supplier: Supplier;
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

export const PurchaseBill: React.FC<PurchaseBillProps> = ({ purchase, supplier }) => {

    const { billNumber, billDate, items, totalAmount, paidAmount } = purchase;
    const amountInWords = numberToWords(totalAmount);
    const balanceDue = totalAmount - paidAmount;

    return (
        <div className="bg-white text-black p-8 font-sans w-full min-h-full" id="purchase-bill-print">
            <header className="pb-6 border-b-2 border-gray-700">
                <h2 className="text-3xl font-bold text-center text-primary uppercase mb-4">Purchase Bill</h2>
                <div className="grid grid-cols-2 gap-x-6">
                    <div className="space-y-1">
                        <h3 className="font-bold text-gray-700 mb-1">Supplier:</h3>
                        <p className="font-semibold text-gray-800 text-lg">{supplier.name}</p>
                        <p className="text-sm text-gray-600 max-w-xs">{supplier.address}</p>
                        {supplier.phone && <p className="text-sm text-gray-600">Phone: {supplier.phone}</p>}
                        {supplier.email && <p className="text-sm text-gray-600">Email: {supplier.email}</p>}
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-sm text-gray-900"><strong>Bill No:</strong> {billNumber || 'N/A'}</p>
                        <p className="text-sm text-gray-900"><strong>Bill Date:</strong> {format(new Date(billDate), 'd MMM, yyyy')}</p>
                    </div>
                </div>
            </header>

            <section className="my-8">
                <table className="w-full text-sm">
                    <thead className="bg-primary/80 text-primary-foreground print-color-exact">
                        <tr>
                            <th className="text-left font-semibold p-2">#</th>
                            <th className="text-left font-semibold p-2">Item Name</th>
                            <th className="text-right font-semibold p-2">Quantity</th>
                            <th className="text-right font-semibold p-2">Rate</th>
                            <th className="text-right font-semibold p-2">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index} className="border-b border-gray-100">
                                <td className="p-2">{index + 1}</td>
                                <td className="p-2 font-medium text-gray-800">{item.itemName}</td>
                                <td className="text-right p-2">{item.quantity}</td>
                                <td className="text-right p-2 font-mono">₹{item.rate.toFixed(2)}</td>
                                <td className="text-right p-2 font-semibold font-mono">₹{(item.quantity * item.rate).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            
            <section className="mt-8 flex justify-between items-start">
                 <div className="w-1/2">
                    <p className="font-bold text-xs">Amount in words:</p>
                    <p className="text-gray-600 text-xs">{amountInWords}</p>
                 </div>
                <div className="w-full max-w-xs ml-auto space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium text-gray-800 text-right flex items-center justify-end gap-1"><IndianRupee className="h-3 w-3" />{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Amount Paid:</span>
                        <span className="font-medium text-gray-800 text-right flex items-center justify-end gap-1"><IndianRupee className="h-3 w-3" />{paidAmount.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t-2 border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-lg font-bold text-gray-900">Balance Due:</span>
                            <span className="text-lg font-bold text-destructive flex items-center gap-1"><IndianRupee className="h-5 w-5" />{balanceDue.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="mt-16 text-xs text-gray-500 border-t border-gray-700 pt-4">
               This is a computer-generated bill.
            </footer>
        </div>
    );
};
