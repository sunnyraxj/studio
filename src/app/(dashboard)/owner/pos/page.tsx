'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Products</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="flex flex-col items-center justify-center p-4 hover:bg-accent cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  <div className="text-sm font-medium text-center">
                    {product.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ₹{product.price.toFixed(2)}
                  </div>
                  <Button variant="ghost" size="icon" className="mt-2 h-8 w-8">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Current Sale</CardTitle>
            <CardDescription>
              {invoiceNumber ? `Invoice #INV${invoiceNumber}` : '...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <Separator />
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
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No items in sale
                    </TableCell>
                  </TableRow>
                )}
                {cart.map((item) => (
                  <TableRow key={item.product.id}>
                    <TableCell className='font-medium'>{item.product.name}</TableCell>
                    <TableCell className="text-center">
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
                    <TableCell className="text-right">
                      ₹{(item.product.price * item.quantity).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch space-y-2">
            <Button className="w-full" disabled={cart.length === 0}>Complete Sale</Button>
            <Button variant="destructive" className="w-full" onClick={clearSale} disabled={cart.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear Sale
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
