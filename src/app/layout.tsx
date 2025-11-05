
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider, useDoc, useMemoFirebase } from '@/firebase';
import { AppShell } from '@/components/app-shell';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Hammer } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Logo } from '@/components/icons';
import Image from 'next/image';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

type AppSettings = {
  maintenanceModeEnabled?: boolean;
};

const MaintenancePage = () => (
    <div className="flex h-screen items-center justify-center bg-gray-100 p-4">
        <div className="text-center">
            <Image src="/logo512.png" alt="Fair Chain Logo" width={64} height={64} className="mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">Under Maintenance</h1>
            <p className="mt-2 text-gray-600">The site is currently under maintenance. Please check back later.</p>
        </div>
    </div>
);


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="en">
      <head>
        <title>Fair Chain</title>
        <meta name="description" content="Fair Chain - The future of decentralized applications." />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo512.png"></link>
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/logo512.png" type="image/png" sizes="any" />
      </head>
      <body className={`${poppins.className} antialiased`}>
        <FirebaseClientProvider>
          <AuthWrapper>{children}</AuthWrapper>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [isInitialUserLoading, setIsInitialUserLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  const appSettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'app_settings', 'main') : null), [firestore]);
  const { data: appSettings, isLoading: isLoadingAppSettings } = useDoc<AppSettings>(appSettingsRef);
  
  const isAdmin = user?.email === 'shavezahmad035@gmail.com';
  const isAuthPage = pathname === '/';
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsInitialUserLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (isInitialUserLoading || isLoadingAppSettings) return;

    if (appSettings?.maintenanceModeEnabled && !isAdmin) {
      return; 
    }

    if (user) { 
      if (user.emailVerified) {
        if (isAuthPage) {
          router.replace('/home');
        }
      } else {
        if (!isAuthPage) {
           router.replace('/');
        }
      }
    } else { 
      if (!isAuthPage) {
        router.replace('/');
      }
    }
  }, [user, isInitialUserLoading, isLoadingAppSettings, appSettings, pathname, router, isAdmin, isAuthPage]);


  const loadingScreen = (
    <div className="flex h-screen items-center justify-center bg-gray-100">
        <div>
            <Image src="/logo512.png" alt="Fair Chain Logo" width={64} height={64} className="mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-gray-800">Welcome to Fair Chain</h1>
        </div>
    </div>
  );
  
  if (isInitialUserLoading || isLoadingAppSettings) {
    return loadingScreen;
  }
  
  if (appSettings?.maintenanceModeEnabled && !isAdmin) {
      return <MaintenancePage />;
  }

  if (user && user.emailVerified) {
    return isAuthPage ? loadingScreen : <AppShell>{children}</AppShell>;
  }

  if (!user || !user.emailVerified) {
    return isAuthPage ? <>{children}</> : loadingScreen;
  }

  return loadingScreen;
}
