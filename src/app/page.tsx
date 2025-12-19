
'use client';

import { Building, Shield, Gem } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type UserProfile = {
  subscriptionStatus?: string;
  role?: 'user' | 'admin';
};

const roles = [
  {
    name: 'Shop Owner / Staff',
    description: 'Manage your shop, products, and sales.',
    icon: Building,
    href: '/dashboard',
    id: 'dashboard',
    role: 'user',
  },
  {
    name: 'Admin',
    description: 'Login to the admin panel to oversee the platform.',
    icon: Shield,
    href: '/login?role=admin',
    id: 'admin',
    role: 'admin',
  },
];

export default function RoleSelectionPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);

  const { data: userData } = useDoc<UserProfile>(userDocRef);

  const getBadge = (roleId: string) => {
    if (isUserLoading) {
      return null;
    }
    if (roleId === 'dashboard') {
      if (!user) {
        return <Badge className="absolute top-2 right-2">Demo</Badge>;
      }
      if (userData?.subscriptionStatus === 'active') {
        return <Badge variant="secondary" className="absolute top-2 right-2 bg-green-500 text-white">Pro</Badge>;
      }
    }
    return null;
  };

  const isSubscribed = userData?.subscriptionStatus === 'active' || userData?.role === 'admin';


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center mb-12 px-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Welcome to Apna Billing Hub
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Select how you want to enter the application.
        </p>
      </div>
      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full px-6",
        !isSubscribed && "md:grid-cols-3"
        )}>
        {roles.map((role) => {
          if (role.role === 'admin' && userData?.role === 'user') {
            return null; // Don't show admin login for regular users
          }
          if (role.role === 'user' && userData?.role === 'admin') {
            return null; // Don't show user dashboard for admins
          }

          return (
            <Link href={role.href} key={role.name}>
              <Card className="relative hover:bg-accent hover:border-primary transition-all duration-200 cursor-pointer h-full flex flex-col">
                {getBadge(role.id)}
                <CardHeader className="items-center text-center">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                    <role.icon className="h-8 w-8" />
                  </div>
                  <CardTitle>{role.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-center flex-grow">
                  <CardDescription>{role.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          )
        })}
        {!isSubscribed && (
             <Card className="relative bg-primary/5 border-primary transition-all duration-200 h-full flex flex-col text-center md:col-span-1">
              <CardHeader className="items-center text-center">
                <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                  <Gem className="h-8 w-8" />
                </div>
                <CardTitle>Upgrade to Pro</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex-grow flex flex-col justify-between">
                <CardDescription>Get full access to all features and manage your shop professionally.</CardDescription>
                 <Link href="/subscribe" passHref className="mt-4">
                    <Button className="w-full">Get Started</Button>
                </Link>
              </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
