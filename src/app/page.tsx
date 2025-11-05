
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc, runTransaction, increment, collection, where, query, getDocs } from 'firebase/firestore';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { GoogleIcon, Logo } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const registerSchema = z
  .object({
    fullName: z.string().min(3, 'Full name must be at least 3 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const EmailOnlyForm = ({ title, description, buttonText, onSubmit, onBack }: { title: string, description: string, buttonText: string, onSubmit: (email: string) => Promise<void>, onBack: () => void }) => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast({ variant: 'destructive', title: 'Email required', description: 'Please enter your email address.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit(email);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
      <div className="space-y-4 mt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white text-black border-gray-300"
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : buttonText}
            </Button>
        </form>
         <div className="text-center text-sm">
            <button onClick={onBack} className="underline text-blue-600">
                Back to Login
            </button>
        </div>
      </div>
    );
};


export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const searchParams = useSearchParams();
  const referrerId = searchParams.get('ref');

  const { auth, firestore } = useFirebase();
  const { isUserLoading } = useUser();
  const { toast } = useToast();

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', username: '', email: '', password: '', confirmPassword: '', terms: false },
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  
  const handleRegister = async (values: z.infer<typeof registerSchema>) => {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: 'Firebase service is not available. Please try again later.',
      });
      return;
    }
  
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
  
      if (!user) {
        throw new Error("User creation failed, please try again.");
      }
      
      const userData = {
        id: user.uid,
        email: values.email,
        fullName: values.fullName,
        username: values.username,
        verifiedBalance: 0,
        unverifiedBalance: 0,
        usdtBalance: 0,
        fairxBalance: 0,
        kycStatus: 'none',
        role: 'user',
        createdAt: serverTimestamp(),
        lastCheckIn: null,
        miningStartedAt: null,
        referrals: { 
            verified: 0, 
            unverified: 0,
            unverifiedRewards: { usdt: 0, fair: 0 },
            verifiedRewards: { usdt: 0, fair: 0 }
        },
        referredBy: referrerId || null,
      };

      if (referrerId) {
        await runTransaction(firestore, async (transaction) => {
          const referrerRef = doc(firestore, 'users', referrerId);
          const newUserRef = doc(firestore, 'users', user.uid);
          
          const referrerDoc = await transaction.get(referrerRef);
          if (!referrerDoc.exists()) {
            console.warn("Referrer not found, proceeding with normal registration.");
            transaction.set(newUserRef, userData);
          } else {
            transaction.set(newUserRef, userData);
            transaction.update(referrerRef, { 
              'referrals.unverified': increment(1),
              'referrals.unverifiedRewards.usdt': increment(0.5),
              'referrals.unverifiedRewards.fair': increment(3),
            });
          }
        });
      } else {
        await setDoc(doc(firestore, 'users', user.uid), userData);
      }
      
      await sendEmailVerification(user);

      toast({
        title: 'Account Created!',
        description: 'Please check your email inbox (and spam folder) to verify your account.',
        duration: 8000,
      });

      registerForm.reset();
      setActiveTab('login');
  
    } catch (error: any) {
      let description = 'An unknown error occurred. Please try again.';

      if (error.code === 'auth/email-already-in-use') {
        description = 'This email is already registered. Please log in or use the "Forgot password" link.';
      } else if (error.code === 'auth/weak-password') {
        description = 'Password is too weak. It must be at least 8 characters long and include uppercase, lowercase, and a number.';
      } else if (error.code === 'auth/invalid-email') {
        description = 'The email address is not valid.';
      } else if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        description = 'Failed to save user data due to a permissions issue. Please contact support.';
      } else {
        description = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: description,
      });
    }
  };

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        await sendEmailVerification(user);
        toast({
          variant: 'destructive',
          title: 'Email Not Verified',
          description: 'A new verification link has been sent. Please check your inbox and spam folder.',
          duration: 8000
        });
      }

    } catch (error: any) {
      let description = 'Invalid credentials or user not found. Please check your email and password.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        description = 'Invalid email or password. Please try again.';
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: description,
      });
    }
  };
  
  const handleSocialSignIn = async (provider: GoogleAuthProvider) => {
    if (!auth || !firestore) return;

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const additionalInfo = getAdditionalUserInfo(result);

        if (additionalInfo?.isNewUser) {
            const userData = {
                id: user.uid,
                email: user.email,
                fullName: user.displayName,
                username: user.email?.split('@')[0], 
                verifiedBalance: 0,
                unverifiedBalance: 0,
                usdtBalance: 0,
                fairxBalance: 0,
                kycStatus: 'none',
                role: 'user',
                createdAt: serverTimestamp(),
                lastCheckIn: null,
                miningStartedAt: null,
                referrals: { 
                    verified: 0, 
                    unverified: 0,
                    unverifiedRewards: { usdt: 0, fair: 0 },
                    verifiedRewards: { usdt: 0, fair: 0 }
                },
                referredBy: referrerId || null,
            };

            if (referrerId) {
                await runTransaction(firestore, async (transaction) => {
                    const referrerRef = doc(firestore, 'users', referrerId);
                    const newUserRef = doc(firestore, 'users', user.uid);

                    const referrerDoc = await transaction.get(referrerRef);
                     if (!referrerDoc.exists()) {
                        console.warn("Referrer not found, proceeding with normal registration.");
                        transaction.set(newUserRef, userData);
                    } else {
                        transaction.set(newUserRef, userData);
                        transaction.update(referrerRef, { 
                          'referrals.unverified': increment(1),
                          'referrals.unverifiedRewards.usdt': increment(0.5),
                          'referrals.unverifiedRewards.fair': increment(3),
                        });
                    }
                });
            } else {
                await setDoc(doc(firestore, 'users', user.uid), userData);
            }
            toast({ title: 'Account Created!', description: 'Welcome to Fair Chain.' });
        } else {
            toast({ title: 'Login Successful', description: 'Welcome back!' });
        }
    } catch (error: any) {
        let description = 'An unknown error occurred. Please try again.';
        if (error.code === 'auth/account-exists-with-different-credential') {
            description = 'An account already exists with the same email address but different sign-in credentials.';
        } else if (error.code === 'auth/popup-closed-by-user') {
            description = 'The sign-in window was closed before completion.';
        } else if (error.code) {
            description = error.message;
        }
        toast({
            variant: 'destructive',
            title: 'Sign-In Failed',
            description,
        });
    }
  };

  const handlePasswordReset = async (email: string) => {
    try {
        await sendPasswordResetEmail(auth, email);
        toast({ title: 'Password Reset Email Sent', description: 'Check your inbox for instructions to reset your password.' });
        setIsForgotPassword(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const renderHeader = () => {
    if (isForgotPassword) {
      return { title: 'Forgot Password?', description: 'Enter your email to receive a reset link.' };
    }
    return { title: 'Welcome to Fair Chain', description: activeTab === 'login' ? 'Sign in to your account' : 'Create a new account' };
  };

  const { title, description } = renderHeader();

  const AuthProviders = () => (
    <div className="space-y-3">
        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
            </div>
        </div>
        <Button variant="outline" className="w-full" onClick={() => handleSocialSignIn(new GoogleAuthProvider())}>
            <GoogleIcon className="mr-2 h-5 w-5" />
            Continue with Google
        </Button>
    </div>
);

  if (isUserLoading) {
      return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
         <CardHeader className="text-center">
            <div className="mx-auto mb-4">
               <Logo className="h-12 w-12" />
            </div>
            <CardTitle className="text-2xl text-black">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            {!isForgotPassword ? (
              <div className="flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                     <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4 mt-4">
                            <FormField
                            control={loginForm.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-black">Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="name@example.com" {...field} className="bg-white text-black border-gray-300" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-black">Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} className="bg-white text-black border-gray-300" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">
                                            {showPassword ? <EyeOff className="h-5 w-5 text-gray-400"/> : <Eye className="h-5 w-5 text-gray-400"/>}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                                {loginForm.formState.isSubmitting ? 'Please wait...' : 'Login'}
                            </Button>
                        </form>
                    </Form>
                     <div className="mt-4 text-center text-sm">
                        <button onClick={() => setIsForgotPassword(true)} className="underline text-blue-600">
                           Forgot Password?
                        </button>
                    </div>
                    <AuthProviders />
                </TabsContent>
                <TabsContent value="register">
                    <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4 mt-4">
                            <FormField
                            control={registerForm.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-black">Full Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="John Doe" {...field} className="bg-white text-black border-gray-300" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={registerForm.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-black">Username</FormLabel>
                                <FormControl>
                                    <Input placeholder="johndoe99" {...field} className="bg-white text-black border-gray-300" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={registerForm.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-black">Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="name@example.com" {...field} className="bg-white text-black border-gray-300" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-black">Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} className="bg-white text-black border-gray-300" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">
                                        {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                                    </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                             <FormField
                            control={registerForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-black">Confirm Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                    <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" {...field} className="bg-white text-black border-gray-300" />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                                    </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="terms"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="text-sm font-normal text-black">
                                      I agree to the terms and conditions.
                                    </FormLabel>
                                    <FormMessage />
                                  </div>
                                </FormItem>
                              )}
                            />
                            <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting || !registerForm.watch('terms')}>
                                {registerForm.formState.isSubmitting ? 'Registering...' : 'Create Account'}
                            </Button>
                        </form>
                    </Form>
                     <AuthProviders />
                </TabsContent>
                </Tabs>
              </div>
            ) : (
                <EmailOnlyForm
                    title="Forgot Password?"
                    description="Enter your email to receive a reset link."
                    buttonText="Send Reset Link"
                    onSubmit={handlePasswordReset}
                    onBack={() => setIsForgotPassword(false)}
                />
            )}

        </CardContent>
      </Card>
    </div>
  );
}

