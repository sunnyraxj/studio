
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
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
import { PlusCircle, Search, Trash2, MinusCircle, IndianRupee } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';


type Product = {
  id: string;
  name: string;
  price: number;
  margin: number;
  sku?: string;
  hsn?: string;
  gst?: number;
};

type CartItem = {
  product: Product;
  quantity: number;
  discount: number;
};

type UserProfile = {
  shopId?: string;
}

type Sale = {
    invoiceNumber: string;
    date: string;
}

type PaymentDetails = {
    cash?: number;
    card?: number;
    upi?: number;
}

const sampleProducts: Product[] = [
  { id: "1", name: 'T-Shirt', price: 250, margin: 25, sku: 'TS-01', hsn: '6109', gst: 5 },
  { id: "2", name: 'Jeans', price: 750, margin: 30, sku: 'JN-01', hsn: '6203', gst: 5 },
  { id: "3", name: 'Sneakers', price: 1200, margin: 40, sku: 'SH-01', hsn: '6404', gst: 18 },
  { id: "4", name: 'Watch', price: 3500, margin: 50, sku: 'WT-01', hsn: '9102', gst: 18 },
  { id: "5", name: 'Cap', price: 150, margin: 20, sku: 'CP-01', hsn: '6505', gst: 12 },
  { id: "6", name: 'Socks', price: 80, margin: 15, sku: 'SK-01', hsn: '6115', gst: 5 },
  { id: "7", name: 'Backpack', price: 900, margin: 35, sku: 'BP-01', hsn: '4202', gst: 18 },
  { id: "8", name: 'Hoodie', price: 1100, margin: 30, sku: 'HD-01', hsn: '6110', gst: 12 },
  { id: "9", name: 'Sunglasses', price: 450, margin: 45, sku: 'SG-01', hsn: '9004', gst: 18 },
  { id: "10", name: 'Belt', price: 300, margin: 28, sku: 'BL-01', hsn: '3926', gst: 18 },
];

export default function POSPage() {
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

  const productsCollectionRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return collection(firestore, `shops/${shopId}/products`);
  }, [firestore, shopId, isDemoMode]);

  const { data: productsData } = useCollection<Product>(productsCollectionRef);
  const products = isDemoMode ? sampleProducts : productsData || [];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPin, setCustomerPin] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('name');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    cash: 0,
    card: 0,
    upi: 0,
  });

  const generateNextInvoiceNumber = async () => {
    if (isDemoMode || !firestore || !shopId) {
        const currentYear = new Date().getFullYear();
        setInvoiceNumber(`INV-${currentYear}-0001`);
        return;
    }

    const currentYear = new Date().getFullYear();
    const salesCollectionRef = collection(firestore, `shops/${shopId}/sales`);
    
    // Query for the last sale of the current year
    const q = query(
        salesCollectionRef, 
        orderBy('date', 'desc'), 
        limit(1)
    );

    const querySnapshot = await getDocs(q);
    let lastInvoiceNumber = 0;
    
    if (!querySnapshot.empty) {
        const lastSale = querySnapshot.docs[0].data() as Sale;
        const lastInvoice = lastSale.invoiceNumber; // e.g., "INV-2024-0015"
        
        const parts = lastInvoice.split('-');
        if (parts.length === 3) {
            const yearOfLastInvoice = parseInt(parts[1], 10);
            if (yearOfLastInvoice === currentYear) {
                lastInvoiceNumber = parseInt(parts[2], 10);
            }
        }
    }
    
    const nextInvoiceNumber = (lastInvoiceNumber + 1).toString().padStart(4, '0');
    setInvoiceNumber(`INV-${currentYear}-${nextInvoiceNumber}`);
};

  useEffect(() => {
    generateNextInvoiceNumber();
  }, [shopId, isDemoMode, firestore]);

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
      return [...prevCart, { product: productToAdd, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, amount: number) => {
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
  
  const updateDiscount = (productId: string, discount: number) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, discount: isNaN(discount) ? 0 : discount } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const getSubtotal = () => {
    return cart.reduce((acc, item) => {
      const itemTotal = item.product.price * item.quantity;
      const discountAmount = itemTotal * (item.discount / 100);
      return acc + (itemTotal - discountAmount);
    }, 0);
  };

  const subtotal = getSubtotal();
  const taxRate = 0.05; // 5%
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  
  const totalPaid = (paymentDetails.cash || 0) + (paymentDetails.card || 0) + (paymentDetails.upi || 0);
  const remainingBalance = total - totalPaid;

  const filteredProducts = products.filter((product) => {
    if (searchBy === 'name') {
      return product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    } else if (searchBy === 'mrp') {
      return product.price.toString().includes(searchTerm);
    }
    return false;
  });

  const clearSale = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerPin('');
    setCustomerState('');
    setCustomerGstin('');
    setPaymentMode('cash');
    setPaymentDetails({ cash: 0, card: 0, upi: 0 });
    generateNextInvoiceNumber();
  };

  const completeSale = async () => {
    if (paymentMode === 'both' && remainingBalance !== 0) {
        toast({
            variant: 'destructive',
            title: 'Payment Mismatch',
            description: 'The total paid amount does not match the total sale amount.'
        });
        return;
    }

    if (isDemoMode) {
      toast({
        title: 'Sale Completed (Demo)',
        description: `Sale ${invoiceNumber} has been recorded in memory.`
      });
      clearSale();
      return;
    }

    if (!firestore || !shopId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot find your shop. Please ensure you are subscribed.'
      });
      return;
    }

    const saleData: any = {
      date: new Date().toISOString(),
      total: total,
      subtotal: subtotal,
      tax: tax,
      taxRate: taxRate,
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        discount: item.discount,
        margin: item.product.margin || 0,
        sku: item.product.sku || '',
        hsn: item.product.hsn || '',
        gst: item.product.gst || 0,
      })),
      customer: {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        pin: customerPin,
        state: customerState,
        gstin: customerGstin,
      },
      paymentMode: paymentMode,
      invoiceNumber: invoiceNumber,
    };
    
    if (paymentMode === 'both') {
        saleData.paymentDetails = {
            cash: paymentDetails.cash || 0,
            card: paymentDetails.card || 0,
            upi: paymentDetails.upi || 0,
        }
    }

    try {
      const salesCollectionRef = collection(firestore, `shops/${shopId}/sales`);
      await addDoc(salesCollectionRef, saleData);
      toast({
        title: 'Sale Completed',
        description: `Sale ${invoiceNumber} has been recorded.`
      });
      clearSale();
    } catch(error: any) {
      toast({
        variant: 'destructive',
        title: 'Error completing sale',
        description: error.message
      })
    }
  };

  const getCartItemQuantity = (productId: string) => {
    const item = cart.find(cartItem => cartItem.product.id === productId);
    return item ? item.quantity : 0;
  }
  
  const handlePaymentDetailChange = (method: keyof PaymentDetails, value: string) => {
    const amount = parseFloat(value) || 0;
    setPaymentDetails(prev => ({ ...prev, [method]: amount }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
        {/* Left Column: Product Catalog */}
        <div className="lg:col-span-7 flex flex-col h-full">
            <Card className="flex-grow flex flex-col">
                <CardHeader>
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center space-x-4">
                            <Label className="text-sm font-medium">Search By:</Label>
                            <RadioGroup
                                value={searchBy}
                                onValueChange={setSearchBy}
                                className="flex items-center space-x-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="name" id="name" />
                                    <Label htmlFor="name">Name/Code</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mrp" id="mrp" />
                                    <Label htmlFor="mrp">MRP</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow p-0">
                    <ScrollArea className="h-[calc(100vh-220px)]">
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                            {filteredProducts.map((product) => {
                                const quantityInCart = getCartItemQuantity(product.id);
                                return (
                                    <Card
                                        key={product.id}
                                        className="group relative flex flex-col items-center justify-center p-3 hover:bg-green-100 cursor-pointer transition-colors shadow-sm"
                                        onClick={() => addToCart(product)}
                                    >
                                        {quantityInCart > 0 && (
                                        <Badge 
                                            variant="secondary"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center bg-primary text-primary-foreground"
                                        >
                                            {quantityInCart}
                                        </Badge>
                                        )}
                                        <div className="text-xs sm:text-sm font-semibold text-center">
                                            {product.name}
                                        </div>
                                        <div className="text-sm text-foreground font-semibold mt-1">
                                        MRP: ₹{product.price.toFixed(2)}
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Billing */}
        <div className="lg:col-span-5 flex flex-col h-full">
            <Card className="h-full flex flex-col rounded-lg">
                <CardHeader>
                    <CardTitle>Current Sale</CardTitle>
                    <CardDescription>
                        {invoiceNumber ? `Invoice #${invoiceNumber}` : '...'}
                    </CardDescription>
                </CardHeader>
                <div className="flex-grow overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-4 pt-0">
                            <Separator />
                            <div className="py-2">
                                {cart.length === 0 ? (
                                     <div className="text-center text-muted-foreground py-10">
                                        No items in sale
                                     </div>
                                ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-center">Qty</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cart.map((item) => {
                                            const itemTotal = item.product.price * item.quantity;
                                            const discountAmount = itemTotal * (item.discount / 100);
                                            const finalPrice = itemTotal - discountAmount;
                                            return (
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
                                                <TableCell className="text-right py-2">₹{finalPrice.toFixed(2)}</TableCell>
                                                <TableCell className="text-right py-2">
                                                    <Button variant="ghost" size="icon" className='h-6 w-6 text-red-500 hover:text-red-700' onClick={() => removeItem(item.product.id)}>
                                                        <Trash2 className='h-4 w-4' />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                                )}
                            </div>
                            <Separator />
                            <div className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="customer-name">Customer Name</Label>
                                        <Input id="customer-name" placeholder="Enter customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="customer-phone">Customer Phone</Label>
                                        <Input id="customer-phone" placeholder="Enter phone number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Payment Mode</Label>
                                    <RadioGroup value={paymentMode} onValueChange={setPaymentMode} className="flex items-center flex-wrap gap-x-4 gap-y-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="cash" /><Label htmlFor="cash">Cash</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="card" id="card" /><Label htmlFor="card">Card</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="upi" id="upi" /><Label htmlFor="upi">UPI</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="both" id="both" /><Label htmlFor="both">Both</Label></div>
                                    </RadioGroup>
                                </div>
                                {paymentMode === 'both' && (
                                    <Card className="p-4 bg-muted/50">
                                        <h4 className="text-sm font-medium mb-2">Mixed Payment Details</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="cash-amount" className="w-16">Cash</Label>
                                                <div className="relative flex-1"><IndianRupee className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="cash-amount" type="number" placeholder="0.00" className="pl-8" value={paymentDetails.cash || ''} onChange={(e) => handlePaymentDetailChange('cash', e.target.value)} /></div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="card-amount" className="w-16">Card</Label>
                                                <div className="relative flex-1"><IndianRupee className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="card-amount" type="number" placeholder="0.00" className="pl-8" value={paymentDetails.card || ''} onChange={(e) => handlePaymentDetailChange('card', e.target.value)} /></div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="upi-amount" className="w-16">UPI</Label>
                                                <div className="relative flex-1"><IndianRupee className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="upi-amount" type="number" placeholder="0.00" className="pl-8" value={paymentDetails.upi || ''} onChange={(e) => handlePaymentDetailChange('upi', e.target.value)} /></div>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-right text-sm font-medium">Remaining: <span className={remainingBalance !== 0 ? 'text-destructive' : 'text-green-600'}>₹{remainingBalance.toFixed(2)}</span></div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </div>
                <CardFooter className="mt-auto flex-none">
                    <div className='w-full space-y-4'>
                        <div className="space-y-1">
                            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Tax ({(taxRate * 100).toFixed(0)}%)</span><span>₹{tax.toFixed(2)}</span></div>
                            <Separator />
                            <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                        </div>
                        <div className="flex-col items-stretch space-y-2">
                            <Button className="w-full" disabled={cart.length === 0 || (paymentMode === 'both' && remainingBalance !== 0)} onClick={completeSale}>Complete Sale</Button>
                            <Button variant="destructive" className="w-full" onClick={clearSale} disabled={cart.length === 0}><Trash2 className="mr-2 h-4 w-4" /> Clear Sale</Button>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}

    