
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Shield, Gem, Rocket, Eye, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
];

export default function RoleSelectionPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);

  const { data: userData, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  useEffect(() => {
    if (!isUserLoading && !isProfileLoading && userData) {
      if (userData.role === 'admin') {
        router.push('/admin');
      } else if (userData.subscriptionStatus === 'active') {
        router.push('/dashboard');
      }
    }
  }, [user, userData, isUserLoading, isProfileLoading, router]);


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
  
  if (isUserLoading || isProfileLoading || (userData?.role === 'admin') || (userData?.subscriptionStatus === 'active')) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <p>Loading...</p>
        </div>
      )
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center mb-12 px-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Welcome to Axom Billing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Select how you want to enter the application.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-8 max-w-md w-full px-6">
        {roles.map((role) => {
          // This check is no longer strictly necessary with one role but is kept for robustness
          if (userData?.role === 'admin' && role.role === 'user') {
            return null; // Don't show user dashboard for admins
          }

          const cardContent = (
             <Card className="relative hover:bg-accent hover:border-primary transition-all duration-200 cursor-pointer h-full flex flex-col">
                {getBadge(role.id)}
                <CardHeader className="items-center text-center">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                    <role.icon className="h-8 w-8" />
                  </div>
                  <CardTitle>{role.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-center flex-grow flex flex-col justify-between">
                  <CardDescription>{role.description}</CardDescription>
                  {role.id === 'dashboard' && !isSubscribed && (
                     <Button className="w-full mt-4" onClick={() => setIsDialogOpen(true)}>Get Started</Button>
                  )}
                </CardContent>
              </Card>
          );
          
          // If the user is not subscribed, wrap the card content in a div that triggers the dialog
          if (role.id === 'dashboard' && !isSubscribed) {
              return <div key={role.name} onClick={() => setIsDialogOpen(true)}>{cardContent}</div>
          }

          return (
            <Link href={role.href} key={role.name}>
             {cardContent}
            </Link>
          )
        })}
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Choose Your Path</DialogTitle>
            <DialogDescription>
              Explore the demo or unlock all features by subscribing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-4 py-4">
            <Link href="/dashboard" passHref className="flex-1">
              <Button variant="outline" className="w-full h-20 flex-col">
                  <Eye className="h-6 w-6 mb-1" />
                  <span>View Demo</span>
              </Button>
            </Link>
             <Link href="/subscribe" passHref className="flex-1">
              <Button className="w-full h-20 flex-col sparkle">
                  <Rocket className="h-6 w-6 mb-1" />
                  <span>Upgrade to Pro</span>
              </Button>
            </Link>
          </div>
            <div className="text-center">
                <Link href="/login" passHref>
                    <Button variant="link">
                        <LogIn className="h-4 w-4 mr-2" />
                        Login as an existing Pro User
                    </Button>
                </Link>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
