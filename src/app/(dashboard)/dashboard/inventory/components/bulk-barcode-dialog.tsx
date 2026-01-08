
'use client';

import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { InventoryItem } from '../page';
import { BarcodeLabel } from './barcode-label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BulkBarcodeDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    items: InventoryItem[];
    shopName: string;
}

export const BulkBarcodeDialog: React.FC<BulkBarcodeDialogProps> = ({ isOpen, onOpenChange, items, shopName }) => {
    const printRef = useRef<HTMLDivElement>(null);
    
    const handlePrint = () => {
        const printContent = printRef.current;
        if (printContent) {
            const newWindow = window.open('', '_blank', 'width=800,height=600');
            if (newWindow) {
                newWindow.document.write('<html><head><title>Print Barcodes</title>');
                newWindow.document.write('<style>body { margin: 0; padding: 0; } @page { size: auto; margin: 5mm; } .label-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(2.5in, 1fr)); gap: 4px; } .barcode-label { page-break-inside: avoid; } </style>');
                newWindow.document.write('</head><body>');
                newWindow.document.write(printContent.innerHTML);
                newWindow.document.write('</body></html>');
                newWindow.document.close();
                newWindow.focus();
                setTimeout(() => {
                    newWindow.print();
                    newWindow.close();
                }, 250);
            }
        }
    };
    
    if (!items) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Print Selected Barcodes</DialogTitle>
                    <DialogDescription>
                        Preview of barcodes for {items.length} selected items. Adjust your printer settings for label paper.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] border rounded-md p-4">
                   <div ref={printRef}>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 label-grid">
                        {items.map(item => (
                           <div key={item.id} className="flex justify-center items-center barcode-label">
                             <BarcodeLabel item={item} shopName={shopName} />
                           </div>
                        ))}
                    </div>
                   </div>
                </ScrollArea>
                <DialogFooter>
                    <Button onClick={handlePrint} className="w-full">
                        <Printer className="mr-2 h-4 w-4" /> Print Labels
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
