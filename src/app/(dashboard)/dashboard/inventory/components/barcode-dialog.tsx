
'use client';

import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { InventoryItem } from '../page';
import { BarcodeLabel } from './barcode-label';

interface BarcodeDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    item: InventoryItem | null;
    shopName: string;
}

export const BarcodeDialog: React.FC<BarcodeDialogProps> = ({ isOpen, onOpenChange, item, shopName }) => {
    const labelRef = useRef<HTMLDivElement>(null);
    
    const handlePrint = () => {
        const printContent = labelRef.current;
        if (printContent) {
            const newWindow = window.open('', '_blank', 'width=400,height=300');
            if (newWindow) {
                newWindow.document.write('<html><head><title>Print Barcode</title>');
                newWindow.document.write('<style>body { margin: 0; padding: 0; } @page { size: auto; margin: 5mm; }</style>');
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
    
    if (!item) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Print Barcode</DialogTitle>
                    <DialogDescription>
                        Preview of the barcode for {item.name}. Click print to get the label.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 flex justify-center">
                    <div ref={labelRef}>
                        <BarcodeLabel item={item} shopName={shopName} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handlePrint} className="w-full">
                        <Printer className="mr-2 h-4 w-4" /> Print Label
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
