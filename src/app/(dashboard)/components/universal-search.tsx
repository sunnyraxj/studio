
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  File,
  Home,
  Package,
  Printer,
  Users,
  CreditCard,
  Search,
  FileText,
  ScanBarcode,
  Truck,
  BookUser,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';

type NavLink = {
  href: string;
  icon: React.ElementType;
  label: string;
};

type SearchResult = {
  type: 'page' | 'product' | 'customer';
  label: string;
  description?: string;
  href: string;
  icon: React.ElementType;
};

export function UniversalSearch({ navLinks }: { navLinks: NavLink[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemoFirebase(() => (user && firestore ? doc(firestore, `users/${user.uid}`) : null), [user, firestore]);
  const { data: userData } = useDoc(userDocRef);
  const shopId = userData?.shopId;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  const runSearch = useCallback(async () => {
    if (!search.trim() || !firestore || !shopId) {
        setResults([]);
        return;
    }

    const lowercasedSearch = search.toLowerCase();
    
    // Page search (local)
    const pageResults: SearchResult[] = navLinks
        .filter(link => link.label.toLowerCase().includes(lowercasedSearch))
        .map(link => ({
            type: 'page',
            label: link.label,
            href: link.href,
            icon: link.icon,
        }));

    // Product search (Firestore)
    const productsRef = collection(firestore, `shops/${shopId}/products`);
    const productQuery = query(
      productsRef,
      where('name', '>=', lowercasedSearch),
      where('name', '<=', lowercasedSearch + '\uf8ff'),
      limit(5)
    );
    const productSnapshot = await getDocs(productQuery);
    const productResults: SearchResult[] = productSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        type: 'product',
        label: data.name,
        description: `SKU: ${data.sku || 'N/A'}`,
        href: `/dashboard/inventory`, // Or a specific product page if it exists
        icon: Package,
      }
    });

    // Customer search (Firestore, from sales)
    const salesRef = collection(firestore, `shops/${shopId}/sales`);
    const customerQuery = query(
      salesRef,
      where('customer.name', '>=', lowercasedSearch),
      where('customer.name', '<=', lowercasedSearch + '\uf8ff'),
      limit(5)
    );
    const customerSnapshot = await getDocs(customerQuery);
    const customerResults: SearchResult[] = customerSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            type: 'customer',
            label: data.customer.name,
            description: `Invoice: ${data.invoiceNumber}`,
            href: `/dashboard?tab=customers`,
            icon: Users,
        }
    });

    setResults([...pageResults, ...productResults, ...customerResults]);
  }, [search, firestore, shopId, navLinks]);


  useEffect(() => {
      const debounce = setTimeout(() => {
          runSearch();
      }, 300);
      return () => clearTimeout(debounce);
  }, [search, runSearch]);
  
  const handleSelect = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  const getGroupedResults = () => {
    return results.reduce((acc, result) => {
        if (!acc[result.type]) {
            acc[result.type] = [];
        }
        acc[result.type].push(result);
        return acc;
    }, {} as Record<string, SearchResult[]>);
  };

  const groupedResults = getGroupedResults();

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-md text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 mr-2" />
        <span className="hidden lg:inline-flex">Search anything...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
            placeholder="Type to search for pages, products, customers..."
            value={search}
            onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
           {Object.entries(groupedResults).map(([type, items]) => (
                <CommandGroup key={type} heading={type.charAt(0).toUpperCase() + type.slice(1)}>
                    {items.map(item => (
                         <CommandItem
                            key={`${type}-${item.label}-${item.href}`}
                            onSelect={() => handleSelect(item.href)}
                            value={`${item.label} ${item.description}`}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            <div className="flex flex-col">
                                <span>{item.label}</span>
                                {item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
           ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
