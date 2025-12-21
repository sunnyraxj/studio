
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { PlusCircle, Search, Trash2, MinusCircle, ChevronDown } from 'lucide-react';
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
import { collection, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Challan } from './components/challan';


type Product = {
  id: string;
  name: string;
  sku?: string;
  material?: string;
};

type CartItem = {
  product: Product;
  quantity: number;
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
}

const sampleProducts: Product[] = [
  { id: "1", name: 'T-Shirt', sku: 'TS-01', material: 'Cotton' },
  { id: "2", name: 'Jeans', sku: 'JN-01', material: 'Denim' },
  { id: "3", name: 'Sneakers', sku: 'SH-01', material: 'Leather' },
];

export default function ChallanPage() {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('All');
  const [challanNumber, setChallanNumber] = useState('');
  const [challanNotes, setChallanNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState('none');

  const [quickItemName, setQuickItemName] = useState('');
  const [quickItemQty, setQuickItemQty] = useState<number | string>(1);

  const [isChallanOpen, setIsChallanOpen] = useState(false);
  const [lastChallanData, setLastChallanData] = useState<any>(null);
  const challanRef = useRef(null);

  const handlePrint = () => {
    const printContent = challanRef.current;
    if (printContent) {
        const newWindow = window.open('', '_blank', 'width=800,height=600');
        if (newWindow) {
            const printableContent = (printContent as HTMLDivElement).innerHTML;
            
            newWindow.document.write('<html><head><title>Print Challan</title>');
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
            setTimeout(() => {
                newWindow.print();
                newWindow.close();
                setIsChallanOpen(false);
                setLastChallanData(null);
                clearChallan();
            }, 500);
        }
    }
  };
  

  const generateNextChallanNumber = async () => {
    // In a real app, this would query Firestore for the last challan number.
    const currentYear = new Date().getFullYear();
    setChallanNumber(`CHLN-${currentYear}-0001`);
  };

  useEffect(() => {
    generateNextChallanNumber();
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
      return [...prevCart, { product: productToAdd, quantity: 1 }];
    });
  };

  const addQuickItemToCart = () => {
    if (!quickItemName || !quickItemQty) {
      toast({
        variant: 'destructive',
        title: 'Missing Details',
        description: 'Please enter both item name and quantity.',
      });
      return;
    }

    const newProduct: Product = {
      id: `quick-${Date.now()}`,
      name: quickItemName,
      sku: 'N/A',
    };

    setCart((prevCart) => [
      ...prevCart,
      { product: newProduct, quantity: Number(quickItemQty) },
    ]);

    // Reset form
    setQuickItemName('');
    setQuickItemQty(1);
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

  const removeItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };
  
  const filteredProducts = products.filter((product) => {
    const materialFilter = selectedMaterial === 'All' || product.material === selectedMaterial;
    if (!materialFilter) return false;
    return product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const clearChallan = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerPin('');
    setCustomerState('');
    setCustomerGstin('');
    setChallanNotes('');
    setPaymentMode('none');
    generateNextChallanNumber();
  };

  const generateChallan = async () => {
    const challanData = {
      date: new Date().toISOString(),
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        sku: item.product.sku || '',
      })),
      customer: {
        name: customerName || 'N/A',
        phone: customerPhone,
        address: customerAddress,
        pin: customerPin,
        state: customerState,
        gstin: customerGstin,
      },
      challanNumber: challanNumber,
      notes: challanNotes,
      paymentMode: paymentMode,
    };
    
    setLastChallanData(challanData);

    toast({
        title: 'Challan Generated',
        description: `Challan ${challanNumber} is ready to print.`
    });
    setIsChallanOpen(true);
    // In a real app, you would save `challanData` to a `challans` collection in Firestore.
  };

  useEffect(() => {
    if (isChallanOpen && lastChallanData) {
        handlePrint();
    }
  }, [isChallanOpen, lastChallanData]);

  const getCartItemQuantity = (productId: string) => {
    const item = cart.find(cartItem => cartItem.product.id === productId);
    return item ? item.quantity : 0;
  }

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full print-hidden">
        {/* Left Column: Product Catalog */}
        <div className="lg:col-span-7 flex flex-col h-full">
            <Card className="flex-grow flex flex-col">
                <CardHeader>
                    <div className="space-y-4">
                        <div className="p-2 space-y-2 border-b">
                            <Label className="text-sm font-medium">Quick Item Entry</Label>
                            <div className="flex items-center gap-2">
                            <Input
                                placeholder="Item Name"
                                value={quickItemName}
                                onChange={(e) => setQuickItemName(e.target.value)}
                                className="h-8"
                            />
                            <Input
                                type="number"
                                placeholder="Qty"
                                value={quickItemQty}
                                onChange={(e) => setQuickItemQty(e.target.value)}
                                className="h-8 w-20"
                                min="1"
                            />
                            <Button size="sm" onClick={addQuickItemToCart} className="h-8">
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                           <div className="relative flex-grow">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search products by name or code..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter material" />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniqueMaterials.map(material => (
                                        <SelectItem key={material} value={material}>{material}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                        className="group relative flex flex-col items-center justify-center p-4 hover:bg-blue-100 cursor-pointer transition-colors shadow-sm"
                                        onClick={() => addToCart(product)}
                                    >
                                        {quantityInCart > 0 && (
                                        <Badge 
                                            variant="secondary"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground"
                                        >
                                            {quantityInCart}
                                        </Badge>
                                        )}
                                        <div className="text-sm font-semibold text-center leading-tight">
                                            {product.name}
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Challan Details */}
        <div className="lg:col-span-5 flex flex-col h-full">
            <Card className="h-full flex flex-col rounded-lg">
                <CardHeader>
                    <CardTitle>Delivery Challan</CardTitle>
                    <CardDescription>
                        {challanNumber ? `Challan #${challanNumber}` : '...'}
                    </CardDescription>
                </CardHeader>
                <div className="flex-grow overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-4 pt-0">
                            <Separator />
                            <div className="py-2">
                                {cart.length === 0 ? (
                                     <div className="text-center text-muted-foreground py-10">
                                        No items added
                                     </div>
                                ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-center w-[120px]">Qty</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
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
                                                    <Button variant="ghost" size="icon" className='h-6 w-6 text-red-500 hover:text-red-700' onClick={() => removeItem(item.product.id)}>
                                                        <Trash2 className='h-4 w-4' />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                )}
                            </div>
                            <Separator />
                            <div className="p-4 space-y-4">
                               <div className="space-y-2">
                                    <Label htmlFor="customer-name">Receiver Name</Label>
                                    <Input id="customer-name" placeholder="Enter Receiver's Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                                </div>
                                <Collapsible>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full">
                                            Add Shipping Details
                                            <ChevronDown className="h-4 w-4 ml-2" />
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="customer-address">Shipping Address</Label>
                                            <Textarea id="customer-address" placeholder="Enter full shipping address" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                                        </div>
                                         <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="customer-phone">Phone</Label>
                                                <Input id="customer-phone" placeholder="Enter phone number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="customer-pin">PIN Code</Label>
                                                <Input id="customer-pin" placeholder="e.g. 110001" value={customerPin} onChange={(e) => setCustomerPin(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="customer-state">State</Label>
                                            <Input id="customer-state" placeholder="e.g. Delhi" value={customerState} onChange={(e) => setCustomerState(e.target.value)} />
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="customer-gstin">Receiver GSTIN (Optional)</Label>
                                            <Input id="customer-gstin" placeholder="Enter GSTIN" value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} />
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                                <div className="space-y-2">
                                    <Label>Payment Mode</Label>
                                    <RadioGroup value={paymentMode} onValueChange={setPaymentMode} className="flex items-center flex-wrap gap-x-4 gap-y-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="none" id="none" /><Label htmlFor="none">None</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="cash" /><Label htmlFor="cash">Cash</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="card" id="card" /><Label htmlFor="card">Card</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="upi" id="upi" /><Label htmlFor="upi">UPI</Label></div>
                                    </RadioGroup>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="challan-notes">Notes / Remarks</Label>
                                    <Textarea id="challan-notes" placeholder="e.g., Vehicle number, transport details" value={challanNotes} onChange={(e) => setChallanNotes(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>
                <CardFooter className="mt-auto flex-none">
                    <div className='w-full space-y-2'>
                        <Button className="w-full" disabled={cart.length === 0} onClick={generateChallan}>Generate Challan</Button>
                        <Button variant="destructive" className="w-full" onClick={clearChallan} disabled={cart.length === 0}><Trash2 className="mr-2 h-4 w-4" /> Clear</Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    </div>
    <div className='hidden print:block'>
        <div ref={challanRef}>
            {lastChallanData && <Challan challan={lastChallanData} settings={shopSettings} />}
        </div>
    </div>
    <Dialog open={isChallanOpen && !!lastChallanData} onOpenChange={(open) => { if (!open) { setIsChallanOpen(false); setLastChallanData(null); clearChallan(); }}}>
        <DialogContent className="max-w-4xl p-0 border-0">
             <div ref={challanRef}>
                 <Challan challan={lastChallanData} settings={shopSettings} />
             </div>
        </DialogContent>
    </Dialog>
    </>
  );
}

    