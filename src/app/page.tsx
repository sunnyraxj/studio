
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Gem, LayoutDashboard, ShoppingCart, BarChart, Check, LucideProps, BadgePercent, IndianRupee } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';


type UserProfile = {
  subscriptionStatus?: string;
  role?: 'user' | 'admin';
};

type HomepageFeature = {
  id: string;
  title: string;
  description: string;
  icon: string;
  keyPoints: string[];
  imageUrl: string;
  imageHint?: string;
  order: number;
};

type Plan = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  durationValue: number;
  durationType: 'hours' | 'days' | 'months' | 'years';
  description: string;
  features: string[];
  highlight: boolean;
  order: number;
};

const iconMap: { [key: string]: React.FC<LucideProps> } = {
  ShoppingCart,
  LayoutDashboard,
  BarChart,
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

  const featuresQuery = useMemoFirebase(() => {
      if(!firestore) return null;
      return query(collection(firestore, 'homepageFeatures'), orderBy('order'));
  }, [firestore]);
  
  const { data: features, isLoading: isFeaturesLoading } = useCollection<HomepageFeature>(featuresQuery);

  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'plans'), orderBy('order'));
  }, [firestore]);

  const { data: plans, isLoading: isPlansLoading } = useCollection<Plan>(plansQuery);
  
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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
        <div className="relative flex h-14 items-center">
            <Link href="#" className="flex items-center justify-center font-semibold">
            <Gem className="h-6 w-6 mr-2" />
            <span>Axom Billing</span>
            </Link>
            <nav className="ml-auto flex items-center gap-4 sm:gap-6">
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
             <Button asChild variant="outline">
                <Link href="/dashboard">Live Demo</Link>
            </Button>
            <Button asChild>
                <Link href="/subscribe">Get Started with 1rs</Link>
            </Button>
            </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-6 md:py-12 lg:py-16">
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
                    <Link href="/subscribe">Get Started with 1rs</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                     <Link href="/dashboard">Live Demo</Link>
                  </Button>
                </div>
              </div>
              
                <Image
                    src="https://i.pinimg.com/1200x/cc/f7/7d/ccf77d8e42d8865b454a2c4ebdd373ff.jpg"
                    width={1200}
                    height={800}
                    alt="Hero"
                    className="mx-auto aspect-[16/10] overflow-hidden rounded-xl object-contain sm:w-full lg:order-last"
                    data-ai-hint="retail interior"
                />
              
            </div>
          </div>
        </section>
        
        <section className="w-full py-12 md:py-24 lg:py-16 bg-muted">
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
                <div className="mx-auto grid max-w-6xl items-start gap-4 sm:grid-cols-2 md:gap-8 lg:grid-cols-3 mt-8">
                    {isFeaturesLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                             <Card key={i}>
                                <CardContent className="p-6 space-y-4">
                                    <Skeleton className="aspect-video w-full rounded-lg" />
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                </CardContent>
                            </Card>
                        ))
                    ) : features?.map((feature) => {
                        const IconComponent = iconMap[feature.icon] || Gem;
                        return (
                            <Card key={feature.title} className="flex flex-col">
                                {feature.imageUrl && (
                                    <Image
                                        src={feature.imageUrl}
                                        width={600}
                                        height={400}
                                        alt={feature.title}
                                        className="rounded-t-lg object-cover aspect-video"
                                        data-ai-hint={feature.imageHint}
                                    />
                                )}
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><IconComponent className="h-5 w-5" />{feature.title}</CardTitle>
                                    <CardDescription>{feature.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-1 pt-2">
                                        {feature.keyPoints.map(point => (
                                            <li key={point} className="flex items-center gap-2 text-sm font-medium">
                                                <Check className="h-4 w-4 text-green-500" />
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-background px-3 py-1 text-sm">
                  Pricing
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Choose a plan that fits your needs
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Simple, transparent pricing. No hidden fees.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-sm items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3 py-12">
              {isPlansLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                      <CardHeader>
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <Skeleton className="h-8 w-1/2" />
                          <div className="space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                          </div>
                      </CardContent>
                  </Card>
                ))
              ) : plans?.map(plan => (
                <Card key={plan.id} className={cn('flex flex-col rounded-2xl border bg-background/60 backdrop-blur-lg transition-all duration-300 hover:shadow-2xl', plan.highlight ? 'border-primary ring-2 ring-primary' : 'border-border/20')}>
                    {plan.highlight && (
                        <div className="text-center py-1 bg-primary text-primary-foreground text-sm font-semibold sparkle">
                            Most Popular
                        </div>
                    )}
                    {plan.originalPrice && plan.originalPrice > plan.price && (
                        <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 z-10">
                            <BadgePercent className="h-3 w-3"/>
                            Save {Math.round(100 - (plan.price / plan.originalPrice) * 100)}%
                        </div>
                    )}
                    <CardHeader className="p-4 pt-6">
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 flex-grow">
                        <div>
                            <div className="flex items-baseline flex-wrap gap-x-2">
                                <span className="text-4xl font-bold flex items-center gap-1"><IndianRupee className="h-8 w-8"/>{plan.price.toLocaleString('en-IN')}</span>
                                {plan.originalPrice && plan.originalPrice > plan.price && (
                                    <span className="text-lg font-medium text-muted-foreground line-through flex items-center gap-1"><IndianRupee className="h-4 w-4"/>{plan.originalPrice.toLocaleString('en-IN')}</span>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground mb-4 capitalize">
                                For {plan.durationValue} {plan.durationType}
                            </div>
                            <ul className="space-y-2 pt-4">
                                {plan.features.map((feature) => (
                                <li key={feature} className="flex items-start text-sm">
                                    <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button asChild className="w-full">
                        <Link href="/subscribe">Choose Plan</Link>
                      </Button>
                    </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-4 w-full shrink-0 items-center px-4 md:px-6 border-t">
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
