
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useUser, useDoc, useMemoFirebase, useFirebaseApp, useShopSettings } from '@/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from '@/hooks/use-toast.tsx';
import { Upload, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

type ShopSettings = {
    companyName?: string;
    companyAddress?: string;
    companyState?: string;
    companyPin?: string;
    companyGstin?: string;
    companyPhone?: string;
    logoUrl?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    enableKot?: boolean;
}

type UserProfile = {
  shopId?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const firebaseApp = useFirebaseApp();
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

  const { settings: settingsData, isLoading } = useShopSettings();

  // State for Company Details
  const [companyName, setCompanyName] = useState('Demo Company');
  const [companyAddress, setCompanyAddress] = useState('123 Demo Street, Suite 456, Demo City');
  const [companyPin, setCompanyPin] = useState('12345');
  const [companyState, setCompanyState] = useState('Assam');
  const [companyGstin, setCompanyGstin] = useState('29DEMOCOMPANY1Z9');
  const [companyPhone, setCompanyPhone] = useState('9876543210');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // State for Bank Details
  const [bankName, setBankName] = useState('Demo Bank');
  const [accountNumber, setAccountNumber] = useState('1234567890');
  const [ifscCode, setIfscCode] = useState('DEMO0001234');

  // State for UPI Details
  const [upiId, setUpiId] = useState('demo@upi');
  
  // State for POS settings
  const [enableKot, setEnableKot] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settingsData) {
        setCompanyName(settingsData.companyName || '');
        setCompanyAddress(settingsData.companyAddress || '');
        setCompanyState(settingsData.companyState || '');
        setCompanyPin(settingsData.companyPin || '');
        setCompanyGstin(settingsData.companyGstin || '');
        setCompanyPhone(settingsData.companyPhone || '');
        setLogoUrl(settingsData.logoUrl || '');
        setBankName(settingsData.bankName || '');
        setAccountNumber(settingsData.accountNumber || '');
        setIfscCode(settingsData.ifscCode || '');
        setUpiId(settingsData.upiId || '');
        setEnableKot(settingsData.enableKot ?? true);
    }
  }, [settingsData]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoUrl(URL.createObjectURL(file)); // Show preview
    }
  };
  
  const removeLogo = () => {
    setLogoFile(null);
    setLogoUrl('');
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (isDemoMode) {
      toast({ title: 'Success (Demo)', description: 'Settings have been saved in memory.' });
      return;
    }
    if (!settingsDocRef || !shopId || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot save settings. Shop not found.' });
        return;
    }

    let finalLogoUrl = settingsData?.logoUrl || '';

    // Handle logo upload
    if (logoFile) {
        const storage = getStorage(firebaseApp);
        const logoStorageRef = storageRef(storage, `shops/${shopId}/logo/${logoFile.name}`);
        try {
            const snapshot = await uploadBytes(logoStorageRef, logoFile);
            finalLogoUrl = await getDownloadURL(snapshot.ref);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Logo Upload Failed', description: error.message });
            return;
        }
    } else if (logoUrl === '') { // If logo was removed
        finalLogoUrl = '';
    }

    const newSettings: ShopSettings = {
      companyName,
      companyAddress,
      companyState,
      companyPin,
      companyGstin,
      companyPhone,
      logoUrl: finalLogoUrl,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      enableKot,
    };
    
    try {
        await setDoc(settingsDocRef, newSettings, { merge: true });
        
        // Also update the shop's name and logo in the root shop document
        const shopDocRef = doc(firestore, `shops/${shopId}`);
        await updateDoc(shopDocRef, { name: companyName, logoUrl: finalLogoUrl });

        toast({ title: 'Success', description: 'Settings saved successfully!' });
        setLogoFile(null); // Clear file after successful upload
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error saving settings', description: error.message });
    }
  };

  if (isLoading && !isDemoMode) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="flex-1 space-y-4">
       <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
       <p className="text-muted-foreground">
          Manage your company, bank, and payment details for invoices.
       </p>
       <Separator />
      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company">Company Details</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
          <TabsTrigger value="upi">UPI / QR Code</TabsTrigger>
          <TabsTrigger value="pos">POS Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>
                This information will be displayed on your invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                    {logoUrl ? (
                      <>
                        <Image src={logoUrl} alt="Company Logo" layout="fill" objectFit="contain" className="rounded-md" />
                        <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 bg-background rounded-full" onClick={removeLogo}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    {logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                  <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif" />
                </div>
                <p className="text-xs text-muted-foreground">Recommended size: 200x200px. PNG, JPG, GIF up to 1MB.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="Enter your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-address">Company Address</Label>
                <Textarea
                  id="company-address"
                  placeholder="Enter your company's full address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-pin">PIN Code</Label>
                    <Input id="company-pin" value={companyPin} onChange={(e) => setCompanyPin(e.target.value)} placeholder="e.g., 781001" />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="company-state">State</Label>
                    <Input id="company-state" value={companyState} onChange={(e) => setCompanyState(e.target.value)} placeholder="e.g., Assam" />
                  </div>
                </div>
              <div className="space-y-2">
                <Label htmlFor="company-phone">Phone Number</Label>
                <Input
                  id="company-phone"
                  placeholder="Enter your company's phone number"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-gstin">GSTIN</Label>
                <Input
                  id="company-gstin"
                  placeholder="Enter your company's GSTIN"
                  value={companyGstin}
                  onChange={(e) => setCompanyGstin(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bank" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
              <CardDescription>
                These bank details will be shown on invoices for bank transfer payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank-name">Bank Name</Label>
                <Input
                  id="bank-name"
                  placeholder="e.g., State Bank of India"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-number">Account Number</Label>
                <Input
                  id="account-number"
                  placeholder="Enter your bank account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifsc-code">IFSC Code</Label>
                <Input
                  id="ifsc-code"
                  placeholder="Enter your bank's IFSC code"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="upi" className="space-y-4">
           <Card>
            <CardHeader>
              <CardTitle>UPI Details</CardTitle>
              <CardDescription>
                Enter your UPI ID to automatically generate a QR code on invoices for easy payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upi-id">UPI ID</Label>
                <Input
                  id="upi-id"
                  placeholder="e.g., yourname@oksbi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Point of Sale Settings</CardTitle>
              <CardDescription>
                Customize features related to the POS screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-kot" className="text-base">Enable KOT Feature</Label>
                  <p className="text-sm text-muted-foreground">
                    Show the "Print KOT" button on the POS screen for restaurant orders.
                  </p>
                </div>
                <Switch
                  id="enable-kot"
                  checked={enableKot}
                  onCheckedChange={setEnableKot}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}
