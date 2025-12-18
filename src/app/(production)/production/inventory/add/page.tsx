
'use client';

import { useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';


export default function AddProductPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const [productName, setProductName] = useState('');
  const [mrp, setMrp] = useState('');
  const [gst, setGst] = useState('');
  const [hsn, setHsn] = useState('');
  const [productCode, setProductCode] = useState('');
  const [category, setCategory] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('pcs');

  const handleSaveProduct = async () => {
    if (!user || !firestore) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to add a product."
        });
        return;
    }

    const productData = {
      name: productName,
      price: parseFloat(mrp) || 0,
      gst: parseInt(gst) || 0,
      hsn: hsn,
      sku: productCode,
      category: category,
      size: size,
      stock: parseInt(qty) || 0,
      unit: unit,
      ownerId: user.uid,
      dateAdded: new Date().toISOString(),
      status: (parseInt(qty) || 0) > 10 ? 'in stock' : (parseInt(qty) || 0) > 0 ? 'low stock' : 'out of stock'
    };

    try {
        const productsCollectionRef = collection(firestore, `users/${user.uid}/products`);
        await addDoc(productsCollectionRef, productData);
        
        toast({
            title: "Product Saved",
            description: `${productName} has been added to your inventory.`
        });

        router.push('/production/inventory');
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Error saving product",
            description: error.message
        });
    }
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
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>
            Provide essential information about the new product.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              placeholder="e.g., Men's Cotton T-Shirt"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-code">Product Code / SKU</Label>
            <Input
              id="product-code"
              placeholder="e.g., TSHIRT-BLK-L"
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
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
           <Link href="/production/inventory" passHref>
             <Button variant="outline">Cancel</Button>
           </Link>
          <Button onClick={handleSaveProduct}>Save Product</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
