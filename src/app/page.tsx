'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Gem } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';


type UserProfile = {
  subscriptionStatus?: string;
  role?: 'user' | 'admin';
};

export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

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

  if (isUserLoading || isProfileLoading || (userData?.role === 'admin') || (userData?.subscriptionStatus === 'active')) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <p>Loading...</p>
        </div>
      )
  }

  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-section');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-14 flex items-center">
        <Link href="#" className="flex items-center justify-center font-semibold">
          <Gem className="h-6 w-6 mr-2" />
          <span>Axom Billing</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            href="/subscribe"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Login
          </Link>
          <Button asChild>
            <Link href="/subscribe">Get Started</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Streamline Your Business with Axom Billing
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    From point-of-sale to inventory management, our all-in-one solution helps you manage your shop effortlessly. Get started today and take control of your business.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/subscribe">Get Started for Free</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                     <Link href="/dashboard">Live Demo</Link>
                  </Button>
                </div>
              </div>
              {heroImage && (
                <Image
                    src={heroImage.imageUrl}
                    width="1200"
                    height="800"
                    alt="Hero"
                    className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square"
                    data-ai-hint={heroImage.imageHint}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
