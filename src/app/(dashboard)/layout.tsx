
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  CircleUser,
  Menu,
  Package2,
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
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
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

const navLinks = [
  {
    href: '/dashboard',
    icon: Home,
    label: 'Dashboard',
  },
  {
    href: '/dashboard/pos',
    icon: Printer,
    label: 'POS',
  },
  {
    href: '/dashboard/inventory',
    icon: Package,
    label: 'Inventory',
  },
  {
    href: '/dashboard/khata',
    icon: BookUser,
    label: 'Khata Book',
  },
  {
    href: '/dashboard/subscription',
    icon: CreditCard,
    label: 'Subscription'
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
  const { open } = useSidebar();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setIsAccountOpen(false);
    }
  }, [open]);

  const handleLogout = () => {
    if (auth) {
        auth.signOut();
    }
    router.push('/login');
  };

  return (
    <Sidebar>
      <SidebarHeader className="h-14 lg:h-[60px]">
        <div
          className={cn(
            'flex items-center',
            open ? 'gap-2 justify-between' : 'gap-0 justify-center'
          )}
        >
          <Link
            href="/"
            className={cn(
              'flex items-center gap-2 font-semibold',
              open ? 'ml-2' : ''
            )}
          >
            <Package2 className="h-6 w-6" />
            {open && <span className="truncate">{shopName}</span>}
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1">
        <SidebarMenu>
          {navLinks.map((link) => (
            <SidebarMenuItem key={link.label}>
              <Link href={isExpired && link.href !== '/dashboard/subscription' ? '#' : link.href} aria-disabled={isExpired && link.href !== '/dashboard/subscription'}>
                <SidebarMenuButton
                  isActive={pathname === link.href}
                  className={cn(open ? '' : 'justify-center', 'font-bold uppercase font-sans')}
                  tooltip={open ? undefined : link.label}
                  disabled={isExpired && link.href !== '/dashboard/subscription'}
                >
                  <link.icon className="h-4 w-4" />
                  {open && <span>{link.label}</span>}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto p-2">
        {!user && open && (
          <Card className="mb-2">
            <CardHeader className="p-2 pt-0 md:p-4">
              <CardTitle>Upgrade to Pro</CardTitle>
              <CardDescription>
                Unlock all features for production use.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
              <Link href="/subscribe" passHref>
                <Button size="sm" className="w-full">
                  Upgrade
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
        {user && (
          <Collapsible open={isAccountOpen} onOpenChange={setIsAccountOpen}>
            <CollapsibleTrigger asChild>
               <Button
                  variant="ghost"
                  className={cn("w-full flex items-center", open ? "justify-between" : "justify-center")}
                  size={open ? "default" : "icon"}
                >
                <div className="flex items-center gap-2">
                  <CircleUser className="h-5 w-5" />
                  {open && <span>My Account</span>}
                </div>
                {open && (isAccountOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pt-2">
               <Link href={isExpired ? '#' : "/dashboard/settings"} passHref aria-disabled={isExpired}>
                  <Button variant="ghost" className="w-full justify-start gap-2" disabled={isExpired}>
                      <Settings className="h-4 w-4" />
                      Settings
                  </Button>
               </Link>
               <Button variant="ghost" className="w-full justify-start gap-2" disabled={isExpired}>
                  <LifeBuoy className="h-4 w-4" />
                  Support
               </Button>
               <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Logout
               </Button>
            </CollapsibleContent>
          </Collapsible>
        )}
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
      <div className="grid min-h-screen w-full" style={{gridTemplateColumns: 'auto 1fr'}}>
        <AppSidebar shopName={shopName} isExpired={isUIBlocked} />
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
             <div className="w-full flex-1" />
          </header>
          <main className={cn("flex flex-1 flex-col p-4 lg:p-6 overflow-auto", isUIBlocked && "pointer-events-none opacity-50")}>
            {children}
          </main>
        </div>
        <SubscriptionExpiredModal 
            open={isUIBlocked}
            onRenew={() => router.push('/dashboard/subscription')}
        />
      </div>
    </SidebarProvider>
  );
}
