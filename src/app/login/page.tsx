
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast.tsx';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { setDoc } from 'firebase/firestore';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // After login, the layout will handle redirection based on subscription status and role
      if (roleParam === 'superadmin') {
        router.push('/admin');
      } else {
        router.push('/dashboard'); 
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message,
      });
    }
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: 'Passwords do not match.',
      });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      
      const isSuperAdmin = roleParam === 'superadmin';

      // Create a user profile in Firestore
      if (firestore) {
        const userDocRef = doc(firestore, 'users', user.uid);
      
        const userProfile = {
            id: user.uid,
            email: user.email,
            subscriptionStatus: isSuperAdmin ? 'active' : 'inactive',
            role: isSuperAdmin ? 'superadmin' : 'user',
        };
      
        await setDoc(userDocRef, userProfile, { merge: true });
      }

      if (isSuperAdmin) {
        // Superadmins get immediate access to the admin panel
        toast({
            title: 'Admin Account Created',
            description: 'You now have super admin privileges.',
        });
        router.push('/admin');
      } else {
         // Regular users go to the subscription page
        router.push('/subscribe');
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message,
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Tabs defaultValue="login" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>{roleParam === 'superadmin' ? 'Admin Login' : 'Login'}</CardTitle>
              <CardDescription>
                Enter your credentials to access your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleLogin}>
                Login
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>{roleParam === 'superadmin' ? 'Create Admin Account' : 'Sign Up'}</CardTitle>
              <CardDescription>
                {roleParam === 'superadmin' ? 'Create a new account with admin privileges.' : 'Create a new account to get started.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleSignUp}>
                {roleParam === 'superadmin' ? 'Create Admin Account' : 'Sign Up'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
