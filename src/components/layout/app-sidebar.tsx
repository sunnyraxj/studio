import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Box,
  ShoppingCart,
  CreditCard,
  Wallet,
  Bell,
  FileCheck2,
  Users,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/auth';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const shopOwnerNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Box },
  { href: '/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/subscription', label: 'Subscription', icon: CreditCard },
];

const superAdminNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/approvals', label: 'Approvals', icon: FileCheck2, badge: '2' },
  { href: '/shops', label: 'Shops', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export async function AppSidebar() {
  const user = await getAuthenticatedUser();
  const navItems = user?.role === 'super_admin' ? superAdminNav : shopOwnerNav;

  return (
    <Sidebar>
      <SidebarHeader className='p-4'>
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-8 w-8 text-primary">
            <rect width="256" height="256" fill="none"></rect>
            <path d="M56,64H200a8,8,0,0,1,8,8V184a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V72A8,8,0,0,1,56,64Z" opacity="0.2"></path>
            <path d="M48,72V184a8,8,0,0,0,8,8H200a8,8,0,0,0,8-8V72a8,8,0,0,0-8-8H56A8,8,0,0,0,48,72Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></path>
            <line x1="128" y1="64" x2="128" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
            <line x1="96" y1="104" x2="96" y2="128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
            <line x1="160" y1="104" x2="160" y2="128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
          </svg>
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tighter text-primary">Apna Billing</h2>
            <p className="text-xs text-muted-foreground -mt-1">Hub</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild tooltip={item.label}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                  {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className='p-4'>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
            <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="font-medium truncate">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
