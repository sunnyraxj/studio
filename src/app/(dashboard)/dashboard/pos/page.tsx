
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { PlusCircle, Search, Trash2, MinusCircle, IndianRupee, ChevronDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { toast as hotToast } from 'react-hot-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Invoice } from './components/invoice';


type Product = {
  id: string;
  name: string;
  price: number;
  margin: number;
  sku?: string;
  hsn?: string;
  gst?: number;
  material?: string;
};

type CartItem = {
  product: Product;
  quantity: number;
  discount: number;
};

type UserProfile = {
  shopId?: string;
}

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
    invoiceNumber: string;
    date: string;
}

type PaymentDetails = {
    cash?: number;
    card?: number;
    upi?: number;
}

const sampleProducts: Product[] = [
  { id: "1", name: 'T-Shirt', price: 250, margin: 25, sku: 'TS-01', hsn: '6109', gst: 5, material: 'Cotton' },
  { id: "2", name: 'Jeans', price: 750, margin: 30, sku: 'JN-01', hsn: '6203', gst: 5, material: 'Denim' },
  { id: "3", name: 'Sneakers', price: 1200, margin: 40, sku: 'SH-01', hsn: '6404', gst: 18, material: 'Leather' },
  { id: "4", name: 'Watch', price: 3500, margin: 50, sku: 'WT-01', hsn: '9102', gst: 18, material: 'Metal' },
  { id: "5", name: 'Cap', price: 150, margin: 20, sku: 'CP-01', hsn: '6505', gst: 12, material: 'Cotton' },
  { id: "6", name: 'Socks', price: 80, margin: 15, sku: 'SK-01', hsn: '6115', gst: 5, material: 'Cotton' },
  { id: "7", name: 'Backpack', price: 900, margin: 35, sku: 'BP-01', hsn: '4202', gst: 18, material: 'Nylon' },
  { id: "8", name: 'Hoodie', price: 1100, margin: 30, sku: 'HD-01', hsn: '6110', gst: 12, material: 'Fleece' },
  { id: "9", name: 'Sunglasses', price: 450, margin: 45, sku: 'SG-01', hsn: '9004', gst: 18, material: 'Plastic' },
  { id: "10", name: 'Belt', price: 300, margin: 28, sku: 'BL-01', hsn: '3926', gst: 18, material: 'Leather' },
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
  
  const settingsDocRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return doc(firestore, `shops/${shopId}/settings`, 'details');
  }, [firestore, shopId, isDemoMode]);
  const { data: shopSettings } = useDoc<ShopSettings>(settingsDocRef);

  const productsCollectionRef = useMemoFirebase(() => {
    if (isDemoMode || !shopId || !firestore) return null;
    return collection(firestore, `shops/${shopId}/products`);
  }, [firestore, shopId, isDemoMode]);

  const { data: productsData } = useCollection<Product>(productsCollectionRef);
  const products = isDemoMode ? sampleProducts : productsData || [];
  
  const uniqueMaterials = useMemo(() => {
    const materials = new Set(products.map(p => p.material).filter(Boolean));
    return ['All', ...Array.from(materials)];
  }, [products]);

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
  const [selectedMaterial, setSelectedMaterial] = useState('All');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    cash: 0,
    card: 0,
    upi: 0,
  });

  const [quickItemName, setQuickItemName] = useState('');
  const [quickItemQty, setQuickItemQty] = useState<number | string>(1);
  const [quickItemPrice, setQuickItemPrice] = useState<number | string>('');
  const [quickItemGst, setQuickItemGst] = useState<number | string>(5);
  
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const invoiceRef = useRef(null);

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (printContent) {
        const newWindow = window.open('', '_blank', 'width=800,height=600');
        if (newWindow) {
            const printableContent = (printContent as HTMLDivElement).innerHTML;
            
            newWindow.document.write('<html><head><title>Print Invoice</title>');
            // Embed styles directly for better print consistency
            const styles = Array.from(document.styleSheets)
              .map(styleSheet => {
                  try {
                      return Array.from(styleSheet.cssRules)
                          .map(rule => rule.cssText)
                          .join('');
                  } catch (e) {
                      console.log('Access to stylesheet %s is denied. Skipping.', styleSheet.href);
                      return '';
                  }
              })
              .join('');
            
            newWindow.document.write(`<style>${styles}</style>`);
            newWindow.document.write('</head><body>');
            newWindow.document.write(printableContent);
            newWindow.document.write('</body></html>');
            newWindow.document.close();
            newWindow.focus();
            setTimeout(() => { // Timeout to allow content to render
                newWindow.print();
                newWindow.close();
                setIsInvoiceOpen(false);
                setLastSaleData(null);
                clearSale();
            }, 500);
        }
    }
  };
  

  const generateNextInvoiceNumber = async () => {
    if (isDemoMode) {
      const currentYear = new Date().getFullYear();
      setInvoiceNumber(`INV-${currentYear}-0001`);
      return;
    }
    if (!firestore || !shopId) return;

    const currentYear = new Date().getFullYear();
    const salesCollectionRef = collection(firestore, `shops/${shopId}/sales`);
    
    // Fetch the most recent invoice to get the last sequence number
    const q = query(salesCollectionRef, orderBy('date', 'desc'), limit(1));

    const querySnapshot = await getDocs(q);
    let lastInvoiceNumber = 0;
    
    if (!querySnapshot.empty) {
        const lastSale = querySnapshot.docs[0].data() as Sale;
        const lastInvoice = lastSale.invoiceNumber;
        
        const match = lastInvoice.match(/(?:INV|CHLN)-(\d{4})-(\d+)$/);
        if (match) {
            lastInvoiceNumber = parseInt(match[2], 10);
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

  const addQuickItemToCart = () => {
    if (!quickItemName || !quickItemQty || !quickItemPrice) {
      hotToast.error('Please enter item name, quantity, and MRP.');
      return;
    }

    const newProduct: Product = {
      id: `quick-${Date.now()}`,
      name: quickItemName,
      price: Number(quickItemPrice),
      margin: 20,
      sku: 'N/A',
      gst: Number(quickItemGst) || 0,
    };

    setCart((prevCart) => [
      ...prevCart,
      { product: newProduct, quantity: Number(quickItemQty), discount: 0 },
    ]);

    // Reset form
    setQuickItemName('');
    setQuickItemQty(1);
    setQuickItemPrice('');
    setQuickItemGst(5);
  };
  
  const handleQuickItemKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addQuickItemToCart();
    }
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
  
  const { subtotal, cgst, sgst, igst, total } = useMemo(() => {
    const shopState = (shopSettings?.companyState || 'Assam').toLowerCase().trim();
    const customerStateClean = (customerState || '').toLowerCase().trim();
    const isIntraState = customerStateClean === shopState;

    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    cart.forEach(item => {
        const itemTotal = item.product.price * item.quantity;
        const discountAmount = itemTotal * (item.discount / 100);
        const taxableValue = itemTotal - discountAmount;
        subtotal += taxableValue;

        const gstRate = (item.product.gst || 0) / 100;
        const itemGstAmount = taxableValue * gstRate;

        if (isIntraState) {
            cgst += itemGstAmount / 2;
            sgst += itemGstAmount / 2;
        } else {
            igst += itemGstAmount;
        }
    });

    const total = subtotal + cgst + sgst + igst;

    return { subtotal, cgst, sgst, igst, total };

  }, [cart, customerState, shopSettings]);


  const totalPaid = (paymentDetails.cash || 0) + (paymentDetails.card || 0) + (paymentDetails.upi || 0);
  const remainingBalance = total - totalPaid;

  const filteredProducts = products.filter((product) => {
    const materialFilter = selectedMaterial === 'All' || product.material === selectedMaterial;
    if (!materialFilter) return false;

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
  
  const showPrintToast = () => {
      hotToast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Sale Completed!
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Sale {invoiceNumber} has been recorded.
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => {
                hotToast.dismiss(t.id);
                setIsInvoiceOpen(true);
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              View & Print
            </button>
          </div>
        </div>
      ), { duration: 5000 });
      clearSale();
  }


  const completeSale = async () => {
    if (paymentMode === 'both' && remainingBalance.toFixed(2) !== '0.00') {
        hotToast.error('The total paid amount does not match the total sale amount.');
        return;
    }
    
    const saleData: any = {
      date: new Date().toISOString(),
      total: total,
      subtotal: subtotal,
      cgst,
      sgst,
      igst,
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
        name: customerName || 'Walk-in Customer',
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
    
    setLastSaleData(saleData);

    if (isDemoMode) {
      showPrintToast();
      return;
    }

    if (!firestore || !shopId) {
      hotToast.error('Cannot find your shop. Please ensure you are subscribed.');
      return;
    }

    try {
      const salesCollectionRef = collection(firestore, `shops/${shopId}/sales`);
      await addDoc(salesCollectionRef, saleData);
      showPrintToast();
    } catch(error: any) {
      hotToast.error(`Error completing sale: ${error.message}`);
    }
  };

  useEffect(() => {
    if (isInvoiceOpen && lastSaleData) {
        handlePrint();
    }
  }, [isInvoiceOpen, lastSaleData]);

  const getCartItemQuantity = (productId: string) => {
    const item = cart.find(cartItem => cartItem.product.id === productId);
    return item ? item.quantity : 0;
  }
  
  const handlePaymentDetailChange = (method: keyof PaymentDetails, value: string) => {
    const amount = parseFloat(value) || 0;
    setPaymentDetails(prev => ({ ...prev, [method]: amount }));
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full print-hidden">
        {/* Left Column: Product Catalog */}
        <div className="lg:col-span-7 flex flex-col h-full">
            <Card className="flex-grow flex flex-col">
                <CardHeader>
                    <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                            <Label className="text-sm font-medium">Quick Item Entry</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 items-end">
                                <div className="space-y-1 md:col-span-2">
                                    <Label htmlFor="quick-name" className="text-xs">Item Name</Label>
                                    <Input
                                        id="quick-name"
                                        placeholder="Item Name"
                                        value={quickItemName}
                                        onChange={(e) => setQuickItemName(e.target.value)}
                                        onKeyDown={handleQuickItemKeyDown}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="quick-mrp" className="text-xs">MRP</Label>
                                    <Input
                                        id="quick-mrp"
                                        type="number"
                                        placeholder="MRP"
                                        value={quickItemPrice}
                                        onChange={(e) => setQuickItemPrice(e.target.value)}
                                        onKeyDown={handleQuickItemKeyDown}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="quick-qty" className="text-xs">Qty</Label>
                                    <Input
                                        id="quick-qty"
                                        type="number"
                                        placeholder="Qty"
                                        value={quickItemQty}
                                        onChange={(e) => setQuickItemQty(e.target.value)}
                                        onKeyDown={handleQuickItemKeyDown}
                                        className="h-8"
                                        min="1"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="quick-gst" className="text-xs">GST (%)</Label>
                                    <Input
                                        id="quick-gst"
                                        type="number"
                                        placeholder="GST"
                                        value={quickItemGst}
                                        onChange={(e) => setQuickItemGst(e.target.value)}
                                        onKeyDown={handleQuickItemKeyDown}
                                        className="h-8"
                                    />
                                </div>
                                <Button size="sm" onClick={addQuickItemToCart} className="h-8 sm:self-end">
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                           <div className="relative flex-grow">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search products..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Material Filter" />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniqueMaterials.map(material => (
                                        <SelectItem key={material} value={material}>{material}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                    <ScrollArea className="h-[calc(100vh-280px)]">
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 p-2">
                            {filteredProducts.map((product) => {
                                const quantityInCart = getCartItemQuantity(product.id);
                                return (
                                    <Card
                                        key={product.id}
                                        className="group relative flex flex-col items-center justify-center p-2 hover:bg-green-100 cursor-pointer transition-colors shadow-sm"
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
                                        <div className="text-xs font-semibold text-center leading-tight">
                                            {product.name}
                                        </div>
                                        <div className="text-xs text-foreground font-semibold mt-1">
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
                                            <TableHead className="w-[40px]">Sr.</TableHead>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-center w-[100px]">Qty</TableHead>
                                            <TableHead className="text-center w-[80px]">Disc(%)</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cart.map((item, index) => {
                                            const itemTotal = item.product.price * item.quantity;
                                            const discountAmount = itemTotal * (item.discount / 100);
                                            const finalPrice = itemTotal - discountAmount;
                                            return (
                                            <TableRow key={item.product.id}>
                                                <TableCell className="py-2">{index + 1}</TableCell>
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
                                                 <TableCell className="text-center py-2">
                                                    <Input
                                                        type="number"
                                                        className="h-8 w-16 text-center"
                                                        value={item.discount}
                                                        onChange={(e) => updateDiscount(item.product.id, parseFloat(e.target.value))}
                                                        onFocus={(e) => e.target.select()}
                                                        placeholder="0"
                                                    />
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
                                        <Input id="customer-name" placeholder="Walk-in Customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                         <Label htmlFor="customer-state">State</Label>
                                         <Input id="customer-state" placeholder="e.g. Assam" value={customerState} onChange={(e) => setCustomerState(e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="customer-phone">Customer Phone</Label>
                                        <Input id="customer-phone" placeholder="Enter phone number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="customer-pin">PIN Code</Label>
                                        <Input id="customer-pin" placeholder="e.g. 110001" value={customerPin} onChange={(e) => setCustomerPin(e.target.value)} />
                                    </div>
                                </div>
                                <Collapsible>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full">
                                            More Customer Details
                                            <ChevronDown className="h-4 w-4 ml-2" />
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="customer-address">Address</Label>
                                            <Textarea id="customer-address" placeholder="Enter full address" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="customer-gstin">Customer GSTIN</Label>
                                            <Input id="customer-gstin" placeholder="Enter GSTIN" value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} />
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
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
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                            {cgst > 0 && <div className="flex justify-between"><span>CGST</span><span>₹{cgst.toFixed(2)}</span></div>}
                            {sgst > 0 && <div className="flex justify-between"><span>SGST</span><span>₹{sgst.toFixed(2)}</span></div>}
                            {igst > 0 && <div className="flex justify-between"><span>IGST</span><span>₹{igst.toFixed(2)}</span></div>}
                            <Separator />
                            <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                        </div>
                        <div className="flex-col items-stretch space-y-2">
                            <Button className="w-full" disabled={cart.length === 0 || (paymentMode === 'both' && remainingBalance.toFixed(2) !== '0.00')} onClick={completeSale}>Generate Invoice</Button>
                            <Button variant="destructive" className="w-full" onClick={clearSale} disabled={cart.length === 0}><Trash2 className="mr-2 h-4 w-4" /> Clear Sale</Button>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    </div>
    <div className='hidden print:block'>
        <div ref={invoiceRef}>
            {lastSaleData && <Invoice sale={lastSaleData} settings={shopSettings} />}
        </div>
    </div>
    <Dialog open={isInvoiceOpen} onOpenChange={(open) => { if (!open) { setIsInvoiceOpen(false); setLastSaleData(null); }}}>
        <DialogContent className="max-w-4xl p-0 border-0">
             <DialogHeader className="sr-only">
                <DialogTitle>Invoice</DialogTitle>
                <DialogDescription>A preview of the invoice for printing.</DialogDescription>
            </DialogHeader>
             <div ref={invoiceRef}>
                 <Invoice sale={lastSaleData} settings={shopSettings} />
             </div>
        </DialogContent>
    </Dialog>
    </>
  );
}
