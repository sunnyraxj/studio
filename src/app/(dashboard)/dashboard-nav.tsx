'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  Users,
  LineChart,
  Printer,
  Package2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/owner/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/owner/pos', icon: Printer, label: 'POS' },
  { href: '#', icon: Package, label: 'Products', disabled: true },
  { href: '#', icon: Users, label: 'Customers', disabled: true },
  { href: '#', icon: LineChart, label: 'Analytics', disabled: true },
];

export function DashboardNav({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();

  const NavLink = ({
    href,
    icon: Icon,
    label,
    disabled,
    isMobile,
  }: {
    href: string;
    icon: React.ElementType;
    label: string;
    disabled?: boolean;
    isMobile: boolean;
  }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={disabled ? '#' : href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
          isActive && 'bg-muted text-primary',
          disabled && 'pointer-events-none opacity-50',
          isMobile &&
            'mx-[-0.65rem] gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground',
          isMobile && isActive && 'bg-muted text-foreground'
        )}
      >
        <Icon className={cn('h-4 w-4', isMobile && 'h-5 w-5')} />
        {label}
      </Link>
    );
  };

  if (isMobile) {
    return (
      <nav className="grid gap-2 text-lg font-medium">
        <Link
          href="#"
          className="flex items-center gap-2 text-lg font-semibold mb-4"
        >
          <Package2 className="h-6 w-6" />
          <span className="sr-only">Acme Inc</span>
        </Link>
        {navLinks.map((link) => (
          <NavLink key={link.label} {...link} isMobile={true} />
        ))}
      </nav>
    );
  }

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {navLinks.map((link) => (
        <NavLink key={link.label} {...link} isMobile={false} />
      ))}
    </nav>
  );
}
