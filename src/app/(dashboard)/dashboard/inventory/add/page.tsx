
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, query, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';
import { CalendarIcon, FileDown, FileUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

type UserProfile = {
  shopId?: string;
}

type ShopSettings = {
    companyName?: string;
}

export default function AddProductPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const isDemoMode = !user;

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);
  const { data: userData } = useDoc<UserProfile>(userDocRef);
  const shopId = userData?.shopId;
  
  const settingsDocRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return doc(firestore, `shops/${shopId}/settings`, 'details');
  }, [firestore, shopId, isDemoMode]);
  const { data: settingsData } = useDoc<ShopSettings>(settingsDocRef);


  const [productName, setProductName] = useState('');
  const [mrp, setMrp] = useState('');
  const [margin, setMargin] = useState('');
  const [gst, setGst] = useState('');
  const [hsn, setHsn] = useState('');
  const [productCode, setProductCode] = useState('');
  const [category, setCategory] = useState('');
  const [material, setMaterial] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [returnableToSupplier, setReturnableToSupplier] = useState(false);
  
  useEffect(() => {
    const generateNextProductCode = async () => {
      if (!firestore || !shopId) {
        setProductCode(`${'SHOP'}-001`);
        return;
      }
  
      const shopName = settingsData?.companyName || 'SHOP';
      const prefix = shopName.substring(0, 4).toUpperCase();

      const productsCollectionRef = collection(firestore, `shops/${shopId}/products`);
      const q = query(
        productsCollectionRef,
        orderBy('sku', 'desc'),
        limit(1)
      );
  
      try {
        const querySnapshot = await getDocs(q);
        let lastSkuNumber = 0;
        if (!querySnapshot.empty) {
            const lastProduct = querySnapshot.docs[0].data();
            const lastSku = lastProduct.sku as string;
            if (lastSku && lastSku.startsWith(prefix + '-')) {
                const parts = lastSku.split('-');
                const lastNum = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(lastNum)) {
                    lastSkuNumber = lastNum;
                }
            }
        }
        const newSkuNumber = (lastSkuNumber + 1).toString().padStart(3, '0');
        setProductCode(`${prefix}-${newSkuNumber}`);
      } catch (e) {
        console.error("Could not generate SKU", e);
        setProductCode(`${prefix}-001`);
      }
    }
    
    // Only generate if productCode is not manually set.
    if (!productCode) {
      generateNextProductCode();
    }
  }, [firestore, shopId, settingsData, productCode]);


  const handleSaveProduct = async () => {
    if (isDemoMode) {
        toast({
            title: "Product Saved (Demo)",
            description: "This product is saved in memory and will be gone on refresh."
        });
        router.push('/dashboard/inventory');
        return;
    }

    if (!firestore || !shopId) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot find your shop. Please ensure you are subscribed."
        });
        return;
    }

    if (!productName) {
        toast({
            variant: "destructive",
            title: "Product Name Required",
            description: "Please enter a name for the product."
        });
        return;
    }
    
    if (!margin) {
        toast({
            variant: "destructive",
            title: "Margin Required",
            description: "Please enter a profit margin for the product."
        });
        return;
    }

    let finalSku = productCode;
    if (!finalSku) {
        toast({
            variant: 'destructive',
            title: 'SKU Generation Failed',
            description: 'Could not generate an SKU. Please enter one manually or try again.',
        });
        return;
    }

    const productData = {
      name: productName,
      price: parseFloat(mrp) || 0,
      margin: parseFloat(margin) || 0,
      gst: parseInt(gst) || 0,
      hsn: hsn,
      sku: finalSku,
      category: category,
      material: material,
      size: size,
      stock: parseInt(qty) || 0,
      unit: unit,
      dateAdded: new Date().toISOString(),
      status: (parseInt(qty) || 0) > 10 ? 'in stock' : (parseInt(qty) || 0) > 0 ? 'low stock' : 'out of stock',
      expiryDate: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null,
      returnableToSupplier: returnableToSupplier,
    };

    try {
        const productsCollectionRef = collection(firestore, `shops/${shopId}/products`);
        await addDoc(productsCollectionRef, productData);
        
        toast({
            title: "Product Saved",
            description: `${productName} has been added to your inventory with SKU ${finalSku}.`
        });

        router.push('/dashboard/inventory');
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Error saving product",
            description: error.message
        });
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Product Name': '',
        'Product Code / SKU': '',
        'MRP (₹)': '',
        'Margin (%)': '',
        'GST (%)': '',
        'HSN Code': '',
        'Category': '',
        'Material': '',
        'Size': '',
        'Opening Quantity': '',
        'Unit': 'pcs',
        'Expiry Date (YYYY-MM-DD)': '',
        'Returnable to Supplier (Yes/No)': 'No',
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Template');
    XLSX.writeFile(workbook, 'ProductImportTemplate.xlsx');
  };

  const handleImportProducts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isDemoMode) {
      toast({
        title: 'Import Successful (Demo)',
        description: `Products from ${file.name} have been added to memory.`,
      });
      router.push('/dashboard/inventory');
      return;
    }
    
    if (!firestore || !shopId) {
       toast({ variant: 'destructive', title: 'Error', description: 'Shop not found.' });
       return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const productsToImport = XLSX.utils.sheet_to_json(worksheet) as any[];

        const batch = writeBatch(firestore);
        const productsCollectionRef = collection(firestore, `shops/${shopId}/products`);
        
        for (const product of productsToImport) {
            let sku = product['Product Code / SKU'];
            
            const stock = parseInt(product['Opening Quantity']) || 0;
            const expiry = product['Expiry Date (YYYY-MM-DD)'];
            const returnable = product['Returnable to Supplier (Yes/No)']?.toLowerCase() === 'yes';
            
            const productData = {
              name: product['Product Name'] || '',
              sku: sku,
              price: parseFloat(product['MRP (₹)']) || 0,
              margin: parseFloat(product['Margin (%)']) || 0,
              gst: parseInt(product['GST (%)']) || 0,
              hsn: product['HSN Code'] || '',
              category: product['Category'] || '',
              material: product['Material'] || '',
              size: product['Size'] || '',
              stock: stock,
              unit: product['Unit'] || 'pcs',
              dateAdded: new Date().toISOString(),
              status: stock > 10 ? 'in stock' : stock > 0 ? 'low stock' : 'out of stock',
              expiryDate: expiry ? format(new Date(expiry), 'yyyy-MM-dd') : null,
              returnableToSupplier: returnable,
            };
            
            if (!productData.name || !productData.margin) {
                console.warn("Skipping product with missing name or margin:", product);
                continue;
            }
            
            const newDocRef = doc(productsCollectionRef);
            batch.set(newDocRef, productData);
        }

        await batch.commit();

        toast({
          title: 'Import Successful',
          description: `${productsToImport.length} products have been imported.`,
        });
        router.push('/dashboard/inventory');

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: error.message,
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };


  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Add New Product</h2>
            <p className="text-muted-foreground">
                Fill in the details below to add a new product to your inventory.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <FileDown className="mr-2 h-4 w-4" /> Download Template
            </Button>
            <Button asChild variant="outline">
              <label htmlFor="import-file">
                <FileUp className="mr-2 h-4 w-4" /> Import Products
                <input
                  id="import-file"
                  type="file"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleImportProducts}
                />
              </label>
            </Button>
        </div>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>
            Provide essential information about the new product. SKU is optional and will be auto-generated.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name <span className="text-destructive">*</span></Label>
            <Input
              id="product-name"
              placeholder="e.g., Men's Cotton T-Shirt"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-code">Product Code / SKU (Optional)</Label>
            <Input
              id="product-code"
              placeholder="Auto-generated if left blank"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="mrp">MRP (₹)</Label>
            <Input
              id="mrp"
              type="number"
              placeholder="e.g., 499"
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="margin">Margin (%) <span className="text-destructive">*</span></Label>
            <Input
              id="margin"
              type="number"
              placeholder="e.g., 25"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gst">GST (%)</Label>
            <Input
              id="gst"
              type="number"
              placeholder="e.g., 5"
              value={gst}
              onChange={(e) => setGst(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hsn">HSN Code</Label>
            <Input
              id="hsn"
              placeholder="e.g., 610910"
              value={hsn}
              onChange={(e) => setHsn(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              placeholder="e.g., Apparel"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="material">Material</Label>
            <Input
              id="material"
              placeholder="e.g., Cotton"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="size">Size</Label>
            <Input
              id="size"
              placeholder="e.g., L, M, XL or 32, 34"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">Opening Quantity</Label>
            <Input
              id="qty"
              type="number"
              placeholder="e.g., 100"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger id="unit">
                <SelectValue placeholder="Select a unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                <SelectItem value="kg">Kilograms (kg)</SelectItem>
                <SelectItem value="g">Grams (g)</SelectItem>
                <SelectItem value="ltr">Liters (ltr)</SelectItem>
                <SelectItem value="ml">Milliliters (ml)</SelectItem>
                <SelectItem value="m">Meters (m)</SelectItem>
                <SelectItem value="box">Box</SelectItem>
                <SelectItem value="pair">Pair</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiry-date">Expiry Date</Label>
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expiryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={expiryDate}
                  onSelect={setExpiryDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="lg:col-span-4 flex items-center space-x-2 pt-2">
            <Switch id="returnable-to-supplier" checked={returnableToSupplier} onCheckedChange={setReturnableToSupplier} />
            <Label htmlFor="returnable-to-supplier">Returnable to Supplier</Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
           <Link href="/dashboard/inventory" passHref>
             <Button variant="outline">Cancel</Button>
           </Link>
          <Button onClick={handleSaveProduct}>Save Product</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
