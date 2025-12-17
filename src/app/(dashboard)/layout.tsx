
'use client';

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
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

const navLinks = [
  {
    href: '/owner/dashboard',
    icon: Home,
    label: 'Dashboard',
    badge: null,
  },
  {
    href: '/owner/pos',
    icon: Printer,
    label: 'POS',
    badge: null,
  },
  {
    href: '#',
    icon: Package,
    label: 'Products',
    disabled: true,
    badge: null,
  },
  {
    href: '#',
    icon: Users,
    label: 'Customers',
    disabled: true,
    badge: null,
  },
  {
    href: '#',
    icon: LineChart,
    label: 'Analytics',
    disabled: true,
    badge: null,
  },
];

function AppSidebar() {
  const pathname = usePathname();
  const { open } = useSidebar();
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
            {open && <span>Acme Inc</span>}
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

      <SidebarFooter className="mt-auto">
        {open && (
          <Card>
            <CardHeader className="p-2 pt-0 md:p-4">
              <CardTitle>Upgrade to Pro</CardTitle>
              <CardDescription>
                Unlock all features and get unlimited access to our support
                team.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
              <Button size="sm" className="w-full">
                Upgrade
              </Button>
            </CardContent>
          </Card>
        )}
        <div className={cn("flex p-2 items-center", open ? "justify-between" : "justify-center")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size={open ? "default" : "icon"}
                  className={cn(!open && "rounded-full w-8 h-8")}
                >
                  <CircleUser className="h-5 w-5" />
                  {open && <span className='ml-2'>My Account</span>}
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/owner/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function MobileSidebar() {
  const pathname = usePathname();
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
            <span className="sr-only">Acme Inc</span>
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
              <Button size="sm" className="w-full">
                Upgrade
              </Button>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr]">
        <AppSidebar />
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <MobileSidebar />
            <div className="w-full flex-1">{/* Add nav items here */}</div>
          </header>
          <main className="flex flex-1 flex-col p-4 lg:p-6 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
