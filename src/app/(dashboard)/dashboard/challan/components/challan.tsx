
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
}

type Challan = {
  date: string;
  items: any[];
  customer: {
    name: string;
    phone?: string;
    address?: string;
    pin?: string;
    state?: string;
    gstin?: string;
  };
  challanNumber: string;
  notes?: string;
};

interface ChallanProps {
    challan: Challan | null;
    settings: ShopSettings | null;
}

export const Challan: React.FC<ChallanProps> = ({ challan, settings }) => {
    if (!challan || !settings) {
        return <div className="p-10">Loading challan...</div>;
    }
    
    const {
        challanNumber,
        date,
        customer,
        items,
        notes
    } = challan;

    return (
        <div className="bg-white text-black text-[10px] leading-snug p-8 font-sans" style={{width: '210mm', minHeight: '297mm', border: '1px solid black'}}>
            <div className="text-center pb-2 border-b-2 border-black">
                <h1 className="text-xl font-bold uppercase">Delivery Challan</h1>
            </div>
            
            <div className="grid grid-cols-2 gap-4 py-4 border-b-2 border-black">
                <div>
                     {settings.logoUrl && (
                        <div className="relative w-20 h-20 mb-2">
                            <Image src={settings.logoUrl} alt="Company Logo" layout="fill" objectFit="contain" />
                        </div>
                    )}
                    <h3 className="font-bold mb-1">From:</h3>
                    <p className="font-semibold">{settings.companyName}</p>
                    <p>{settings.companyAddress}</p>
                    <p>Phone: {settings.companyPhone}</p>
                    {settings.companyGstin && <p>GSTIN: {settings.companyGstin}</p>}
                </div>
                 <div className="text-right">
                    <p><strong>Challan No:</strong> {challanNumber}</p>
                    <p><strong>Date:</strong> {format(new Date(date), 'dd-MMM-yyyy')}</p>
                    <div className="mt-4">
                        <h3 className="font-bold mb-1">To (Billed To & Shipped To):</h3>
                        <p className="font-semibold">{customer.name}</p>
                        <p>{customer.address}</p>
                        <p>{customer.state}, {customer.pin}</p>
                        <p>Phone: {customer.phone}</p>
                        {customer.gstin && <p>GSTIN: {customer.gstin}</p>}
                    </div>
                </div>
            </div>

            <div className="min-h-[140mm]">
                <table className="w-full my-4">
                    <thead className="bg-gray-200">
                        <tr className="border border-black">
                            <th className="p-1 border-r border-black w-10">#</th>
                            <th className="p-1 border-r border-black text-left">Item Description</th>
                            <th className="p-1 border-r border-black w-24">SKU</th>
                            <th className="p-1 w-24">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                           <tr key={index} className="border-b border-l border-r border-black">
                               <td className="p-1 border-r border-black text-center">{index + 1}</td>
                               <td className="p-1 border-r border-black">{item.name}</td>
                               <td className="p-1 border-r border-black text-center">{item.sku || 'N/A'}</td>
                               <td className="p-1 text-center">{item.quantity}</td>
                           </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {notes && (
                <div className="py-2 border-t-2 border-black">
                    <p><strong>Notes:</strong> {notes}</p>
                </div>
            )}

            <div className="flex justify-between items-end pt-12 mt-12 border-t-2 border-black">
                <div className="text-center">
                    <p className="font-bold border-t border-black pt-2 px-8">Receiver's Seal & Signature</p>
                </div>
                <div className="text-center">
                    <p className="font-bold border-t border-black pt-2 px-8">For {settings.companyName}</p>
                </div>
            </div>
             <p className="text-center text-gray-600 pt-8">This is a computer-generated delivery challan.</p>

        </div>
    );
};
