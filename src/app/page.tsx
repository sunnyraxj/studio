
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Gem, LayoutDashboard, ShoppingCart, BarChart, Check } from 'lucide-react';
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

const features = [
    {
      id: 'feature-pos',
      title: 'Effortless Point of Sale',
      description: 'A fast, intuitive POS system that makes billing a breeze.',
      icon: ShoppingCart,
      keyPoints: ['Handle Sales', 'Process Returns', 'Create Challans'],
    },
    {
      id: 'feature-inventory',
      title: 'Smart Inventory Control',
      description: 'Manage your products, track stock levels, and generate barcodes.',
      icon: LayoutDashboard,
      keyPoints: ['Product Management', 'Stock Tracking', 'Barcode Generation'],
    },
    {
      id: 'feature-dashboard',
      title: 'Insightful Analytics',
      description: 'Get a clear view of your business performance with powerful reports.',
      icon: BarChart,
      keyPoints: ['Sales Reports', 'Profit Margins', 'Top Products'],
    }
];

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
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
        <div className="relative flex h-14 items-center">
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
        </div>
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
                    width={1200}
                    height={800}
                    alt="Hero"
                    className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square"
                    data-ai-hint={heroImage.imageHint}
                />
              )}
            </div>
          </div>
        </section>
        
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="space-y-2">
                        <div className="inline-block rounded-lg bg-muted-foreground/10 px-3 py-1 text-sm">Key Features</div>
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything You Need to Succeed</h2>
                        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                            Our platform is packed with powerful features designed to simplify your retail operations and boost your growth.
                        </p>
                    </div>
                </div>
                <div className="mx-auto grid max-w-6xl items-start gap-4 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 mt-12">
                    {features.map((feature) => {
                        const featureImage = PlaceHolderImages.find(p => p.id === feature.id);
                        return (
                            <div key={feature.title} className="grid gap-4 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
                                {featureImage && (
                                    <Image
                                        src={featureImage.imageUrl}
                                        width={600}
                                        height={400}
                                        alt={feature.title}
                                        className="rounded-lg object-cover aspect-video"
                                        data-ai-hint={featureImage.imageHint}
                                    />
                                )}
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold flex items-center gap-2"><feature.icon className="h-5 w-5" />{feature.title}</h3>
                                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                                    <ul className="space-y-1 pt-2">
                                        {feature.keyPoints.map(point => (
                                            <li key={point} className="flex items-center gap-2 text-sm font-medium">
                                                <Check className="h-4 w-4 text-green-500" />
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Axom Billing. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
            <Link href="#" className="text-xs hover:underline underline-offset-4">
                Terms of Service
            </Link>
            <Link href="#" className="text-xs hover:underline underline-offset-4">
                Privacy
            </Link>
        </nav>
      </footer>
    </div>
  )
}
