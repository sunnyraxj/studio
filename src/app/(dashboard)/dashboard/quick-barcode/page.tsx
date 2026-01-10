
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Printer, Calendar as CalendarIcon } from 'lucide-react';
import { BarcodeLabel } from '../inventory/components/barcode-label';
import type { InventoryItem } from '../inventory/page';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


type ShopSettings = {
    companyName?: string;
}

export default function QuickBarcodePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isDemoMode = !user;

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);
  const { data: userData } = useDoc<any>(userDocRef);
  const shopId = userData?.shopId;
  
  const settingsDocRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return doc(firestore, `shops/${shopId}/settings`, 'details');
  }, [firestore, shopId, isDemoMode]);
  const { data: settingsData } = useDoc<ShopSettings>(settingsDocRef);
  
  const shopName = isDemoMode ? 'Demo Shop' : settingsData?.companyName || 'My Shop';

  const [product, setProduct] = useState<Partial<InventoryItem>>({
    name: '',
    price: 0,
    sku: '',
    size: '',
    expiryDate: undefined,
  });
  
  const [showBarcode, setShowBarcode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  const handleInputChange = (field: keyof typeof product, value: string | number | Date | undefined) => {
    setProduct(prev => ({ ...prev, [field]: value }));
    setShowBarcode(false);
  }
  
  const handleGenerate = () => {
    setShowBarcode(true);
  }

  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
        const newWindow = window.open('', '_blank', 'width=400,height=300');
        if (newWindow) {
            const printableContent = printContent.innerHTML;
            
            newWindow.document.write('<html><head><title>Print Quick Barcode</title>');
            const styles = Array.from(document.styleSheets)
                .map(styleSheet => {
                    try {
                        return Array.from(styleSheet.cssRules)
                            .map(rule => rule.cssText)
                            .join('');
                    } catch (e) {
                        return '';
                    }
                })
                .join('');

            newWindow.document.write(`<style>${styles}</style>`);
            newWindow.document.write('</head><body>');
            newWindow.document.write(`<div class="print-container">${printableContent}</div>`);
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


  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Quick Barcode Generator</h2>
            <p className="text-muted-foreground">
                Generate a single barcode label without adding the item to your inventory.
            </p>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>
              Enter the item details for the barcode label.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name <span className="text-destructive">*</span></Label>
              <Input
                id="product-name"
                placeholder="e.g., Special Gift Box"
                value={product.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="mrp">MRP (₹) <span className="text-destructive">*</span></Label>
                    <Input
                        id="mrp"
                        type="number"
                        placeholder="e.g., 299"
                        value={product.price || ''}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        required
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="size">Size (Optional)</Label>
                    <Input
                        id="size"
                        placeholder="e.g., L, M, XL"
                        value={product.size}
                        onChange={(e) => handleInputChange('size', e.target.value)}
                    />
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product-code">SKU (Optional)</Label>
                  <Input
                    id="product-code"
                    placeholder="e.g., QCK-001 (or scan existing)"
                    value={product.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="expiry-date">Expiry Date (Optional)</Label>
                     <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !product.expiryDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {product.expiryDate ? format(new Date(product.expiryDate), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={product.expiryDate ? new Date(product.expiryDate) : undefined}
                          onSelect={(date) => handleInputChange('expiryDate', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                </div>
             </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button onClick={handleGenerate} disabled={!product.name || !product.price}>Generate Barcode</Button>
          </CardFooter>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Barcode Preview</CardTitle>
                <CardDescription>This is how your label will look.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
                {showBarcode && product.name ? (
                    <div ref={printRef}>
                       <div className="label-print-container">
                         <BarcodeLabel item={product} shopName={shopName} isQuickBarcode={true} />
                       </div>
                    </div>
                ) : (
                    <div className="w-full h-[1.5in] flex items-center justify-center bg-muted/50 border-dashed border-2 rounded-md">
                        <p className="text-muted-foreground">Fill details to see preview</p>
                    </div>
                )}
            </CardContent>
            {showBarcode && (
                <CardFooter>
                     <Button onClick={handlePrint} className="w-full">
                        <Printer className="mr-2 h-4 w-4" /> Print Label
                    </Button>
                </CardFooter>
            )}
        </Card>
      </div>
    </div>
  );
}
