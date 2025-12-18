
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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

const navLinks = [
  {
    href: '/dashboard',
    icon: Home,
    label: 'Dashboard',
    badge: null,
  },
  {
    href: '/dashboard/pos',
    icon: Printer,
    label: 'POS',
    badge: null,
  },
  {
    href: '/dashboard/inventory',
    icon: Package,
    label: 'Inventory',
    disabled: false,
    badge: null,
  },
  {
    href: '#',
    icon: Users,
    label: 'Customers',
    disabled: true,
    badge: null,
  },
];

type UserProfile = {
  subscriptionStatus?: string;
  role?: 'user' | 'admin';
  shopId?: string;
};

function AppSidebar() {
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
    auth.signOut();
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
            {open && <span>apna billing ERP</span>}
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1">
        <SidebarMenu>
          {navLinks.map((link) => (
            <SidebarMenuItem key={link.label}>
              <Link href={link.disabled ? '#' : link.href}>
                <SidebarMenuButton
                  isActive={pathname === link.href}
                  disabled={link.disabled}
                  className={cn(open ? '' : 'justify-center')}
                  tooltip={open ? undefined : link.label}
                >
                  <link.icon className="h-4 w-4" />
                  {open && <span>{link.label}</span>}
                  {link.badge && open && (
                    <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                      {link.badge}
                    </Badge>
                  )}
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
                Unlock all features and get unlimited access to our support
                team.
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
               <Link href="/dashboard/settings" passHref>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                  </Button>
               </Link>
               <Button variant="ghost" className="w-full justify-start gap-2">
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

function MobileSidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <nav className="grid gap-2 text-lg font-medium">
          <Link
            href="#"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Package2 className="h-6 w-6" />
            <span className="sr-only">apna billing ERP</span>
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.disabled ? '#' : link.href}
              className={cn(
                'mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground',
                pathname === link.href && 'bg-muted text-foreground',
                link.disabled && 'pointer-events-none opacity-50'
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
              {link.badge && (
                <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  {link.badge}
                </Badge>
              )}
            </Link>
          ))}
        </nav>
        {!user && (
          <div className="mt-auto">
            <Card>
              <CardHeader>
                <CardTitle>Upgrade to Pro</CardTitle>
                <CardDescription>
                  Unlock all features and get unlimited access to our support
                  team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/subscribe" passHref>
                  <Button size="sm" className="w-full">
                    Upgrade
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);

  const { data: userData, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    // Wait until both user and their profile data are loaded
    if (isUserLoading || isProfileLoading) {
      return;
    }

    // If a user is logged in, check their status
    if (user && userData) {
      // Admins should not be redirected from the dashboard. They can view it in demo mode.
      if (userData.role === 'admin') {
        return;
      }
      
      // Handle redirects for regular users based on their subscription and shop status.
      switch (userData.subscriptionStatus) {
        case 'pending_verification':
          router.push('/pending-verification');
          break;
        case 'active':
          // If active but no shop, they need to set it up.
          if (!userData.shopId) {
            router.push('/shop-setup');
          }
          // Otherwise, they are active and have a shop, so they can stay.
          break;
        case 'inactive':
        default:
          // Inactive users can now browse the dashboard (in demo mode)
          // and are not automatically redirected to /subscribe.
          break;
      }
    }
  }, [user, userData, isUserLoading, isProfileLoading, router]);

  if (isUserLoading || (user && isProfileLoading)) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center">
            <p>Loading...</p>
        </div>
    );
  }


  return (
    <SidebarProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr]">
        <AppSidebar />
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <MobileSidebar />
            <div className="w-full flex-1" />
          </header>
          <main className="flex flex-1 flex-col p-4 lg:p-6 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
