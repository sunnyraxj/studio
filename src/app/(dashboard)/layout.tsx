
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  CircleUser,
  Menu,
  Home,
  Users,
  LineChart,
  Package,
  Printer,
  ChevronRight,
  ChevronDown,
  LogOut,
  Settings,
  LifeBuoy,
  IndianRupee,
  CreditCard,
  AlertTriangle,
  BookUser,
  Percent,
  FileText,
  ScanBarcode,
  Truck,
} from 'lucide-react';

import {
    Sidebar,
    SidebarProvider,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
    useSidebar,
    SidebarInput,
} from '@/components/ui/sidebar'

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { isAfter } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const navLinks = [
  {
    href: '/dashboard',
    icon: Home,
    label: 'Dashboard',
    category: 'Core Operations'
  },
  {
    href: '/dashboard/pos',
    icon: Printer,
    label: 'POS',
    category: 'Core Operations'
  },
   {
    href: '/dashboard/challan',
    icon: FileText,
    label: 'Challan',
    category: 'Core Operations'
  },
  {
    href: '/dashboard/inventory',
    icon: Package,
    label: 'Inventory',
    category: 'Management'
  },
   {
    href: '/dashboard/suppliers',
    icon: Truck,
    label: 'Suppliers',
    category: 'Management'
  },
  {
    href: '/dashboard/employees',
    icon: Users,
    label: 'Employees',
    category: 'Management'
  },
  {
    href: '/dashboard/quick-barcode',
    icon: ScanBarcode,
    label: 'Quick Barcode',
    category: 'Utilities'
  },
  {
    href: '/dashboard/subscription',
    icon: CreditCard,
    label: 'Subscription',
    category: 'Utilities'
  }
];

type UserProfile = {
  subscriptionStatus?: string;
  subscriptionEndDate?: string;
  role?: 'user' | 'admin';
  shopId?: string;
};

type ShopSettings = {
    companyName?: string;
}

function AppSidebar({ shopName, isExpired }: { shopName: string, isExpired: boolean }) {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = () => {
    if (auth) {
        auth.signOut();
    }
    router.push('/login');
  };
  
  const filteredNavLinks = navLinks.filter(link => 
    link.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedLinks = filteredNavLinks.reduce((acc, link) => {
    const category = link.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(link);
    return acc;
  }, {} as Record<string, typeof navLinks>);

  return (
    <Sidebar className="hidden md:flex">
        <SidebarContent>
            <SidebarHeader>
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <span className="transition-all duration-300 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:invisible">{shopName}</span>
                    </Link>
                </div>
                 <div className="px-2 pt-2 transition-all duration-300 group-data-[collapsible=icon]:-m-8 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:invisible">
                    <SidebarInput 
                        placeholder="Search pages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </SidebarHeader>

            <SidebarMenu>
                 {Object.entries(groupedLinks).map(([category, links]) => (
                    <React.Fragment key={category}>
                        <Separator className="my-2" />
                        {links.map((link) => (
                            <SidebarMenuItem key={link.label}>
                                <Link href={isExpired && link.href !== '/dashboard/subscription' ? '#' : link.href} passHref>
                                    <SidebarMenuButton
                                        isActive={pathname === link.href}
                                        disabled={isExpired && link.href !== '/dashboard/subscription'}
                                        tooltip={link.label}
                                    >
                                        <link.icon className="h-4 w-4" />
                                        <span>{link.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        ))}
                    </React.Fragment>
                ))}
            </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="w-full justify-start">
                     <CircleUser className="mr-2 h-5 w-5" />
                     <span className="group-data-[collapsible=icon]:hidden">My Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                        {user?.email || 'My Account'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild disabled={isExpired}>
                      <Link href={isExpired ? '#' : "/dashboard/settings"}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={isExpired}>
                      <LifeBuoy className="mr-2 h-4 w-4" />
                      <span>Support</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarFooter>
    </Sidebar>
  );
}

function SubscriptionExpiredModal({ open, onRenew }: { open: boolean, onRenew: () => void }) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[425px]" hideCloseButton>
        <DialogHeader className="text-center">
            <div className="mx-auto bg-destructive/10 text-destructive p-3 rounded-full w-fit mb-4">
                <AlertTriangle className="h-8 w-8" />
            </div>
          <DialogTitle className="text-2xl">Subscription Expired</DialogTitle>
          <DialogDescription>
            Your plan has expired. Please renew your subscription to continue using all features.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Button className="w-full" onClick={onRenew}>Renew Subscription</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const MobileSidebar = ({ shopName, isExpired }: { shopName: string; isExpired: boolean }) => {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        if (auth) {
            auth.signOut();
        }
        router.push('/login');
    };

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
                 <SheetHeader>
                   <SheetTitle>{shopName}</SheetTitle>
                   <SheetDescription>Main application navigation links.</SheetDescription>
                 </SheetHeader>
                <nav className="grid gap-2 text-lg font-medium">
                    {navLinks.map((link) => (
                        <Link
                            key={link.label}
                            href={isExpired && link.href !== '/dashboard/subscription' ? '#' : link.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                pathname === link.href && "text-primary bg-muted",
                                isExpired && link.href !== '/dashboard/subscription' && "pointer-events-none opacity-50"
                            )}
                        >
                            <link.icon className="h-4 w-4" />
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <div className="mt-auto space-y-2">
                    <Separator />
                     <Link href={isExpired ? '#' : "/dashboard/settings"} passHref aria-disabled={isExpired}>
                         <Button variant="ghost" className="w-full justify-start gap-2" disabled={isExpired}>
                            <Settings className="h-4 w-4" /> Settings
                         </Button>
                     </Link>
                     <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" /> Logout
                     </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);

  const { data: userData, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  const shopId = userData?.shopId;

  const settingsDocRef = useMemoFirebase(() => {
    if (!shopId || !firestore) return null;
    return doc(firestore, `shops/${shopId}/settings`, 'details');
  }, [shopId, firestore]);

  const { data: settingsData, isLoading: isSettingsLoading } = useDoc<ShopSettings>(settingsDocRef);
  
  const isSubscriptionExpired = React.useMemo(() => {
    if (userData?.subscriptionStatus === 'active' && userData?.subscriptionEndDate) {
        return !isAfter(new Date(userData.subscriptionEndDate), new Date());
    }
    // If status is not active, treat as expired UI-wise
    if(userData?.subscriptionStatus && userData.subscriptionStatus !== 'active') return true;
    return false;
  }, [userData]);


  useEffect(() => {
    if (isUserLoading || isProfileLoading) {
      return;
    }

    if (user && userData) {
      if (userData.role === 'admin') {
        router.push('/admin');
        return;
      }
      
      switch (userData.subscriptionStatus) {
        case 'pending_verification':
          if (userData.shopId && userData.subscriptionType === 'Renew') {
            break;
          }
          router.push('/pending-verification');
          break;
        case 'active':
          if (!shopId) {
            router.push('/shop-setup');
          }
          break;
        case 'inactive':
        case 'rejected':
          router.push('/subscribe');
          break;
        default:
           if (pathname !== '/subscribe') {
              router.push('/subscribe');
          }
          break;
      }
    } else if (!user && !isUserLoading) {
        // Demo mode
    }
  }, [user, userData, isUserLoading, isProfileLoading, router, shopId, pathname]);

  const isLoading = isUserLoading || (user && (isProfileLoading || (!!shopId && isSettingsLoading)));

  if (isLoading) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center">
            <p>Loading...</p>
        </div>
    );
  }

  const shopName = user ? (settingsData?.companyName || 'My Shop') : 'Demo Shop';

  const isUIBlocked = isSubscriptionExpired && pathname !== '/dashboard/subscription';

  return (
    <SidebarProvider>
      <div className='grid min-h-screen w-full md:grid-cols-[auto_1fr]'>
      <AppSidebar shopName={shopName} isExpired={isUIBlocked} />
      <div className="flex flex-col min-h-screen">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <MobileSidebar shopName={shopName} isExpired={isUIBlocked} />
            <div className="w-full flex-1" />
            <Link href="/dashboard/suppliers">
              <Button>
                  <Truck className="mr-2 h-4 w-4" /> Manage Suppliers
              </Button>
            </Link>
            <Link href="/dashboard/employees">
                <Button>
                    <Users className="mr-2 h-4 w-4" /> Manage Employees
                </Button>
            </Link>
        </header>
        <main className={cn("flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6", isUIBlocked && "pointer-events-none opacity-50")}>
            {children}
        </main>
      </div>
      </div>
       <SubscriptionExpiredModal 
            open={isUIBlocked}
            onRenew={() => router.push('/dashboard/subscription')}
        />
    </SidebarProvider>
  );
}

    