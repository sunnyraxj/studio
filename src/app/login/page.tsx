
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
import { useAuth, useCollection, useMemoFirebase } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User,
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast.tsx';
import { doc, getDoc, setDoc, query, where, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Eye, EyeOff } from 'lucide-react';


type UserProfile = {
  role?: 'admin' | 'user';
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  // Query to check if an admin user already exists.
  const adminQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('role', '==', 'admin'));
  }, [firestore]);

  const { data: adminUsers, isLoading: isAdminCheckLoading } = useCollection<UserProfile>(adminQuery);

  const adminExists = !isAdminCheckLoading && adminUsers && adminUsers.length > 0;

  const handleSuccessfulLogin = async (user: User) => {
    if (!firestore) {
        // Default redirect if firestore is not available
        router.push('/dashboard');
        return;
    }
    const userDocRef = doc(firestore, "users", user.uid);
    try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            router.push('/admin');
        } else {
            router.push('/dashboard');
        }
    } catch (error) {
        console.error("Error fetching user document:", error);
        // Default redirect if there's an error fetching the user role
        router.push('/dashboard');
    }
};

  const handleLogin = async () => {
    if (!auth) return;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message,
      });
    }
  };

  const handleSignUp = async () => {
    if (!auth) return;
    // Prevent new admin sign-ups if one already exists
    if (roleParam === 'admin' && adminExists) {
        toast({
            variant: 'destructive',
            title: 'Sign Up Failed',
            description: 'An administrator account already exists.',
        });
        router.push('/login');
        return;
    }
      
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
      
      if (firestore) {
        const userDocRef = doc(firestore, 'users', user.uid);
        
        const role = roleParam === 'admin' && !adminExists ? 'admin' : 'user';
        
        const userProfile = {
            id: user.uid,
            email: user.email,
            subscriptionStatus: role === 'admin' ? 'active' : 'inactive',
            role: role,
        };
      
        await setDoc(userDocRef, userProfile, { merge: true });

        if (role === 'admin') {
            toast({
                title: "Admin Account Created",
                description: "You can now log in with your admin credentials."
            });
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            // Manually set default tab to login
            const loginTrigger = document.querySelector('button[data-radix-collection-item][value="login"]') as HTMLButtonElement | null;
            loginTrigger?.click();

            return;
        }
      }
      
      router.push('/subscribe');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message,
      });
    }
  };

  const isSignupDisabled = roleParam === 'admin' && adminExists;


  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Tabs defaultValue="login" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup" disabled={isSignupDisabled}>Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                {roleParam === 'admin' ? 'Enter your administrator credentials.' : 'Enter your credentials to access your account.'}
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
              <div className="space-y-2 relative">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-7 h-7 w-7 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                </Button>
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
                <CardTitle>Sign Up</CardTitle>
                <CardDescription>
                   {roleParam === 'admin' ? 'Create the master administrator account.' : 'Create a new account to get started.'}
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
                <div className="space-y-2 relative">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                    />
                     <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-7 h-7 w-7 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                    </Button>
                </div>
                <div className="space-y-2 relative">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
                    />
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-7 h-7 w-7 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                    </Button>
                </div>
                </CardContent>
                <CardFooter>
                <Button className="w-full" onClick={handleSignUp}>
                    Sign Up
                </Button>
                </CardFooter>
            </Card>
            </TabsContent>
      </Tabs>
    </div>
  );
}
