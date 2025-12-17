
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Search, Trash2, MinusCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';

type Product = {
  id: number;
  name: string;
  price: number;
};

type CartItem = {
  product: Product;
  quantity: number;
};

const sampleProducts: Product[] = [
  { id: 1, name: 'T-Shirt', price: 250 },
  { id: 2, name: 'Jeans', price: 750 },
  { id: 3, name: 'Sneakers', price: 1200 },
  { id: 4, name: 'Watch', price: 3500 },
  { id: 5, name: 'Cap', price: 150 },
  { id: 6, name: 'Socks', price: 80 },
  { id: 7, name: 'Backpack', price: 900 },
  { id: 8, name: 'Hoodie', price: 1100 },
  { id: 9, name: 'Sunglasses', price: 450 },
  { id: 10, name: 'Belt', price: 300 },
  { id: 11, name: 'Jacket', price: 1500 },
  { id: 12, name: 'Scarf', price: 200 },
  { id: 13, name: 'Gloves', price: 120 },
  { id: 14, name: 'Shorts', price: 400 },
  { id: 15, name: 'Polo Shirt', price: 600 },
  { id: 16, name: 'Leather Wallet', price: 550 },
  { id: 17, name: 'Formal Shoes', price: 2500 },
  { id: 18, name: 'Tie', price: 250 },
  { id: 19, name: 'Sweatshirt', price: 950 },
  { id: 20, name: 'Track Pants', price: 800 },
];

export default function POSPage() {
  const [products] = useState<Product[]>(sampleProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPin, setCustomerPin] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useEffect(() => {
    // Generate invoice number only on the client-side
    setInvoiceNumber(new Date().getTime().toString().slice(-6));
  }, []);

  const addToCart = (productToAdd: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === productToAdd.id
      );
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === productToAdd.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product: productToAdd, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, amount: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQuantity = item.quantity + amount;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const subtotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const taxRate = 0.05; // 5%
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clearSale = () => {
    setCart([]);
    setCustomerName('');
    setCustomerAddress('');
    setCustomerPin('');
    setCustomerState('');
    setCustomerGstin('');
    setPaymentMode('cash');
  };

  return (
     <div className="flex-1 overflow-hidden h-full flex flex-col">
        <div className="flex-none p-4 border-b">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search products..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <ScrollArea className="flex-grow">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 p-4">
                {filteredProducts.map((product) => (
                    <Card
                        key={product.id}
                        className="group relative flex flex-col items-center justify-center p-2 hover:bg-accent cursor-pointer aspect-square transition-colors"
                        onClick={() => addToCart(product)}
                    >
                        <div className="text-xs sm:text-sm font-medium text-center flex-grow flex items-center">
                            {product.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            ₹{product.price.toFixed(2)}
                        </div>
                        <div className="absolute bottom-1 right-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              <PlusCircle className="h-5 w-5" />
                          </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </ScrollArea>
        
        <div className="flex-none border-t h-[45%]">
           <Card className="h-full flex flex-col md:flex-row rounded-none border-0">
             <div className="w-full md:w-3/5 flex flex-col">
                <div className="p-4 border-b border-t md:border-t-0">
                    <h2 className="text-lg font-semibold">Current Sale</h2>
                    <p className="text-sm text-muted-foreground">
                        {invoiceNumber ? `Invoice #INV${invoiceNumber}` : '...'}
                    </p>
                </div>
                 <ScrollArea className="flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cart.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                No items in sale
                                </TableCell>
                            </TableRow>
                            )}
                            {cart.map((item) => (
                            <TableRow key={item.product.id}>
                                <TableCell className='font-medium py-2'>{item.product.name}</TableCell>
                                <TableCell className="text-center py-2">
                                <div className="flex items-center justify-center gap-1">
                                    <Button variant="ghost" size="icon" className='h-6 w-6' onClick={() => updateQuantity(item.product.id, -1)}>
                                    <MinusCircle className='h-4 w-4' />
                                    </Button>
                                    <span>{item.quantity}</span>
                                    <Button variant="ghost" size="icon" className='h-6 w-6' onClick={() => updateQuantity(item.product.id, 1)}>
                                    <PlusCircle className='h-4 w-4' />
                                    </Button>
                                </div>
                                </TableCell>
                                <TableCell className="text-right py-2">
                                ₹{(item.product.price * item.quantity).toFixed(2)}
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
            <div className="w-full md:w-2/5 border-l flex flex-col">
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer-name">Customer Name</Label>
                            <Input
                                id="customer-name"
                                placeholder="Enter customer name"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-address">Address</Label>
                            <Textarea
                                id="customer-address"
                                placeholder="Enter customer address"
                                value={customerAddress}
                                onChange={(e) => setCustomerAddress(e.target.value)}
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="customer-pin">PIN</Label>
                                <Input
                                    id="customer-pin"
                                    placeholder="Enter PIN code"
                                    value={customerPin}
                                    onChange={(e) => setCustomerPin(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customer-state">State</Label>
                                <Input
                                    id="customer-state"
                                    placeholder="Enter state"
                                    value={customerState}
                                    onChange={(e) => setCustomerState(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-gstin">GSTIN</Label>
                            <Input
                                id="customer-gstin"
                                placeholder="Enter GSTIN"
                                value={customerGstin}
                                onChange={(e) => setCustomerGstin(e.target.value)}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label>Payment Mode</Label>
                            <RadioGroup
                                value={paymentMode}
                                onValueChange={setPaymentMode}
                                className="flex items-center space-x-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="cash" id="cash" />
                                    <Label htmlFor="cash">Cash</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="card" id="card" />
                                    <Label htmlFor="card">Card</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="upi" id="upi" />
                                    <Label htmlFor="upi">UPI</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </ScrollArea>
                
                <div className="p-4 border-t mt-auto space-y-4 bg-slate-50">
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                            <span>₹{tax.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold text-lg">
                            <span>Total</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="flex-col items-stretch space-y-2">
                        <Button className="w-full" disabled={cart.length === 0}>Complete Sale</Button>
                        <Button variant="destructive" className="w-full" onClick={clearSale} disabled={cart.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" /> Clear Sale
                        </Button>
                    </div>
                </div>
            </div>
           </Card>
        </div>
    </div>
  );
}

    