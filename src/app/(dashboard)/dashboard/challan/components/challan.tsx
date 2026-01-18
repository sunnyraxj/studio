'use client';

import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { useTranslation } from '@/hooks/use-translation';

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

interface ChallanProps {
    sale: Sale | null;
    settings: ShopSettings | null;
}

export const Challan: React.FC<ChallanProps> = ({ sale, settings }) => {
    const { t } = useTranslation();

    if (!sale || !settings) {
        return <div className="p-8 text-center">{t('Loading challan...')}</div>;
    }
    
    const {
        invoiceNumber,
        date,
        customer,
        items,
        total,
    } = sale;

    return (
        <div className="bg-white text-black p-8 font-sans w-full min-h-full" id="invoice-print">
            <div className="relative z-10">
                <header className="pb-6 border-b-2 border-gray-700">
                    <div className="flex justify-between items-start">
                        {settings.logoUrl && (
                            <Image src={settings.logoUrl} alt={`${settings.companyName} logo`} className="h-16 w-auto" width={64} height={64}/>
                        )}
                        <div className="text-center flex-grow">
                            <h2 className="text-3xl font-bold text-primary uppercase">{t('Delivery Challan')}</h2>
                            <p className="text-sm font-bold text-gray-900"><strong>{t('Challan No:')}</strong> {invoiceNumber}</p>
                            <p className="text-sm font-bold text-gray-900"><strong>{t('Date:')}</strong> {format(new Date(date), 'd/M/yyyy')}</p>
                        </div>
                        <div className="w-16"></div> {/* Spacer */}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 mt-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold text-gray-800">{settings.companyName}</h1>
                            <p className="text-sm text-gray-600 max-w-xs">{settings.companyAddress}</p>
                            <p className="text-sm text-gray-600">{t('Contact:')} {settings.companyPhone}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <h3 className="font-bold text-gray-700 mb-1">{t('Delivered To:')}</h3>
                            <p className="font-semibold text-gray-800 text-base">{customer.name}</p>
                            <p className="text-sm text-gray-600">{customer.address}</p>
                            {customer.state && customer.pin && (
                                <p className="text-sm text-gray-600">{customer.state} - {customer.pin}</p>
                            )}
                            {customer.phone && <p className="text-sm text-gray-600">{t('Phone:')} {customer.phone}</p>}
                        </div>
                    </div>
                </header>

                <section className="my-8">
                    <table className="w-full text-sm">
                        <thead className="bg-primary text-primary-foreground print-color-exact">
                            <tr>
                                <th className="text-left font-semibold p-2">#</th>
                                <th className="text-left font-semibold p-2">{t('Product')}</th>
                                <th className="text-right font-semibold p-2">{t('Qty')}</th>
                                <th className="text-right font-semibold p-2">{t('Rate')}</th>
                                <th className="text-right font-semibold p-2">{t('Total')}</th>
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
                                        <td className="text-right p-2">{item.quantity}</td>
                                        <td className="text-right p-2">{item.price.toFixed(2)}</td>
                                        <td className="text-right p-2 font-semibold">{finalPrice.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>

                <section className="mt-8 flex justify-end">
                    <div className="w-full sm:w-2/3 md:w-1/2">
                        <div className="pt-4 mt-4 border-t-2 border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xl font-bold text-gray-900">{t('Total:')}</span>
                                <span className="text-xl font-bold text-gray-900">₹{total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="mt-16 text-sm text-gray-500 border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-start gap-4">
                       <div className='text-sm text-gray-900 flex-1'>
                            <p className="font-bold text-base text-gray-800">{t('Terms:')}</p>
                            <p className="text-xs">{t('This is a delivery challan and not a tax invoice. All goods remain property of {companyName} until paid for in full.').replace('{companyName}', settings.companyName || '')}</p>
                       </div>
                       <div className="text-center flex-1 ml-auto w-56">
                           <p className="font-semibold">{t('For, {companyName}').replace('{companyName}', settings.companyName || '')}</p>
                           <div className="h-20"></div> {/* Space for stamp/signature */}
                           <p className="font-semibold">{t('Authorised Signatory')}</p>
                       </div>
                   </div>
               </footer>
            </div>
        </div>
    );
};
