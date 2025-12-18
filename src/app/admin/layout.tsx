
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Package2,
  ShieldCheck,
  Store,
  LifeBuoy,
  Settings,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const adminNavLinks = [
  {
    href: '/admin',
    icon: ShieldCheck,
    label: 'Payment Verify',
  },
  {
    href: '/admin/settings',
    icon: Settings,
    label: 'Settings',
  },
  {
    href: '#',
    icon: Store,
    label: 'Shops',
    disabled: true,
  },
  {
    href: '#',
    icon: LifeBuoy,
    label: 'Help to Shops',
    disabled: true,
  },
];

function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Package2 className="h-6 w-6" />
            <span className="">Admin Panel</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {adminNavLinks.map((link) => (
              <Link
                key={link.label}
                href={link.disabled ? '#' : link.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  {
                    'bg-muted text-primary': pathname === link.href,
                    'pointer-events-none opacity-50': link.disabled,
                  }
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <AdminSidebar />
      <div className="flex flex-col">
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
