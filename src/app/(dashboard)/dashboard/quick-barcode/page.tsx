
'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, addDoc, query, orderBy, getDocs, where, limit } from 'firebase/firestore';
import { Printer, Search, IndianRupee, Trash2 } from 'lucide-react';
import { BarcodeLabel } from '../inventory/components/barcode-label';
import type { InventoryItem } from '../inventory/page';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast.tsx';

type ShopSettings = {
    companyName?: string;
}

type QuickPrint = Partial<InventoryItem> & {
    printDate?: string;
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
    price: undefined,
    sku: '',
    size: '',
    expiryDate: undefined,
  });
  
  const [showBarcode, setShowBarcode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  const [inventorySearch, setInventorySearch] = useState('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  const productsCollectionRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return collection(firestore, `shops/${shopId}/products`);
  }, [firestore, shopId, isDemoMode]);

  const { data: productsData } = useCollection<InventoryItem>(productsCollectionRef);
  const products = isDemoMode ? [] : productsData || [];
  
  const quickPrintsQuery = useMemoFirebase(() => {
      if (isDemoMode || !shopId || !firestore) return null;
      return query(collection(firestore, `shops/${shopId}/quickPrints`), orderBy('printDate', 'desc'));
  }, [shopId, firestore, isDemoMode]);
  
  const { data: printHistoryData, isLoading: isHistoryLoading } = useCollection<QuickPrint>(quickPrintsQuery);
  const [demoPrintHistory, setDemoPrintHistory] = useState<QuickPrint[]>([]);

  const filteredProducts = useMemo(() => {
    if (!inventorySearch) return [];
    return products.filter(p => p.name.toLowerCase().includes(inventorySearch.toLowerCase()) || p.sku?.toLowerCase().includes(inventorySearch.toLowerCase()));
  }, [inventorySearch, products]);
  
  const filteredHistory = useMemo(() => {
      const history = isDemoMode ? demoPrintHistory : (printHistoryData || []);
      if (!historySearchTerm) return history;
      return history.filter(p => 
        (p.name && p.name.toLowerCase().includes(historySearchTerm.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(historySearchTerm.toLowerCase()))
      );
  }, [printHistoryData, demoPrintHistory, isDemoMode, historySearchTerm]);

  const handleSelectProduct = (selectedProduct: InventoryItem) => {
    setProduct({
        name: selectedProduct.name,
        price: selectedProduct.price,
        sku: selectedProduct.sku,
        size: selectedProduct.size,
        expiryDate: selectedProduct.expiryDate,
    });
    setInventorySearch('');
    setShowBarcode(false);
  }

  const handleInputChange = (field: keyof typeof product, value: string | number | Date | undefined) => {
    setProduct(prev => ({ ...prev, [field]: value }));
    setShowBarcode(false);
  }
  
  const handleGenerate = () => {
    setShowBarcode(true);
  }

  const saveAndPrint = async () => {
    if (!product.name || !product.price) {
        toast({ variant: 'destructive', title: 'Missing Details', description: 'Product Name and MRP are required.' });
        return;
    }

    const printData: QuickPrint = {
        name: product.name || '',
        price: product.price || 0,
        sku: product.sku || null,
        size: product.size || null,
        expiryDate: product.expiryDate || null,
        printDate: new Date().toISOString()
    };
    
    if (isDemoMode) {
        const isDuplicate = demoPrintHistory.some(p => 
            p.name === printData.name &&
            p.price === printData.price &&
            p.sku === printData.sku &&
            p.size === printData.size &&
            p.expiryDate === printData.expiryDate
        );
        if (!isDuplicate) {
            setDemoPrintHistory(prev => [printData, ...prev]);
            toast({ title: 'Print Saved (Demo)', description: `${product.name} added to history.` });
        }
    } else {
        if (!firestore || !shopId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot save print history. Shop not found.' });
            return;
        }

        const q = query(
            collection(firestore, `shops/${shopId}/quickPrints`),
            where('name', '==', printData.name),
            where('price', '==', printData.price),
            where('sku', '==', printData.sku),
            where('size', '==', printData.size),
            where('expiryDate', '==', printData.expiryDate),
            limit(1)
        );

        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                await addDoc(collection(firestore, `shops/${shopId}/quickPrints`), printData);
            }
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Failed to save print history: ${e.message}` });
        }
    }

    handlePrint();
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
                Generate a single barcode label for existing or new items.
            </p>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>
              Search for an existing item or manually enter details below.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6">
             <div className="p-4 border rounded-lg bg-muted/50 relative space-y-2">
                <Label htmlFor="search-inventory" className="font-semibold">Search Inventory</Label>
                <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    <Input
                        id="search-inventory"
                        placeholder="Search by name or SKU..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        className="bg-background"
                    />
                </div>
                {filteredProducts.length > 0 && (
                    <Card className="absolute z-10 w-[calc(100%-2rem)] mt-1 shadow-lg left-4 right-4">
                    <ScrollArea className="h-40">
                        <CardContent className="p-2">
                        {filteredProducts.map(p => (
                            <div 
                            key={p.id}
                            className="p-2 hover:bg-accent rounded-md cursor-pointer"
                            onClick={() => handleSelectProduct(p)}
                            >
                            <p className="font-medium">{p.name}</p>
                            <p className="text-sm text-muted-foreground">SKU: {p.sku} - MRP: ₹{p.price}</p>
                            </div>
                        ))}
                        </CardContent>
                    </ScrollArea>
                    </Card>
                )}
            </div>

            <div className="flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">OR</span>
                <Separator className="flex-1" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name <span className="text-destructive">*</span></Label>
              <Input
                id="product-name"
                placeholder="e.g., Special Gift Box"
                value={product.name || ''}
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
                        onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                        required
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="size">Size (Optional)</Label>
                    <Input
                        id="size"
                        placeholder="e.g., L, M, XL"
                        value={product.size || ''}
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
                    value={product.sku || ''}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="expiry-date">Expiry Date (Optional)</Label>
                    <Input
                        id="expiry-date"
                        type="date"
                        value={product.expiryDate ? format(new Date(product.expiryDate), 'yyyy-MM-dd') : ''}
                        onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                    />
                </div>
             </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button onClick={handleGenerate} disabled={!product.name || !product.price}>Generate Barcode</Button>
          </CardFooter>
        </Card>
        
        <div className="space-y-4">
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
                         <Button onClick={saveAndPrint} className="w-full">
                            <Printer className="mr-2 h-4 w-4" /> Save & Print Label
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
      </div>
      <Card className="mt-8">
          <CardHeader>
              <CardTitle>Print History</CardTitle>
              <CardDescription>A log of all barcodes generated via this page.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="flex justify-end mb-4">
                  <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Search history..."
                          className="pl-8 w-64"
                          value={historySearchTerm}
                          onChange={(e) => setHistorySearchTerm(e.target.value)}
                      />
                  </div>
              </div>
              <div className="rounded-md border">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Printed On</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead className="text-right">MRP</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {isHistoryLoading ? <TableRow><TableCell colSpan={5} className="text-center h-24">Loading history...</TableCell></TableRow>
                          : filteredHistory.length > 0 ? (
                              filteredHistory.map((item, index) => (
                                  <TableRow key={item.id || index}>
                                      <TableCell>{item.printDate ? format(new Date(item.printDate), 'dd MMM yyyy, hh:mm a') : 'N/A'}</TableCell>
                                      <TableCell className="font-medium">{item.name}</TableCell>
                                      <TableCell>{item.sku || 'N/A'}</TableCell>
                                      <TableCell className="text-right flex items-center justify-end gap-1"><IndianRupee className="h-4 w-4"/>{item.price?.toLocaleString('en-IN')}</TableCell>
                                      <TableCell className="text-right">
                                          <Button variant="outline" size="sm" onClick={() => { setProduct(item); handleGenerate(); }}>
                                              <Printer className="mr-2 h-4 w-4" /> Reprint
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              ))
                          ) : (
                              <TableRow><TableCell colSpan={5} className="text-center h-24">No print history found.</TableCell></TableRow>
                          )}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
