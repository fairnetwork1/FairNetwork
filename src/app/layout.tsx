'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { AppShell } from '@/components/app-shell';
import { Logo } from '@/components/icons';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Hammer } from 'lucide-react';
import Head from 'next/head';
import { onAuthStateChanged } from 'firebase/auth';

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
      {/* CHANGED LOGO */}
      <img src="/logo512.png" alt="Fair Chain Logo" className="h-16 w-16 mx-auto mb-4" />
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
        <meta name="theme-color" content="#f5f5f5" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/logo192.png" />
      </head>
      <body
        className={"${poppins.className} antialiased"}
        style={{
          backgroundColor: '#f5f5f5',
          color: '#1f2937',
          margin: 0,
          padding: 0,
          minHeight: '100vh',
        }}
      >
        <FirebaseClientProvider>
          <AuthWrapper>{children}</AuthWrapper>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user: initialUser, isUserLoading: isInitialUserLoading, auth } = useFirebase();
  const { firestore } = useFirebase();
  const pathname = usePathname();
  const router = useRouter();

  const appSettingsRef = useMemoFirebase(() =>
    firestore ? doc(firestore, 'app_settings', 'main') : null,
  [firestore]);

  const { data: appSettings, isLoading: isLoadingAppSettings } = useDoc<AppSettings>(appSettingsRef);

  const isAuthPage = pathname === '/';
  const isAdmin = initialUser?.uid === 'mgferXC25jOHmMTzpu0p2XqDbKE2';

  useEffect(() => {
    if (isInitialUserLoading || isLoadingAppSettings) return;

    if (appSettings?.maintenanceModeEnabled && !isAdmin) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const userIsVerified = user && user.emailVerified;
      if (userIsVerified) {
        if (isAuthPage) router.replace('/home');
      } else {
        if (!isAuthPage) router.replace('/');
      }
    });

    if (initialUser && initialUser.emailVerified) {
      if (isAuthPage) router.replace('/home');
    } else if (!initialUser && !isAuthPage) {
      router.replace('/');
    }

    return () => unsubscribe();

  }, [isInitialUserLoading, isLoadingAppSettings, auth, appSettings, pathname, router, isAdmin, isAuthPage, initialUser]);

  const loadingScreen = (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div>
        {/* CHANGED LOGO */}
        <img src="/logo512.png" alt="Fair Chain Logo" className="h-16 w-16 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-gray-800">Welcome to Fair Chain</h1>
      </div>
    </div>
  );

  if (isInitialUserLoading || isLoadingAppSettings) return loadingScreen;
  if (appSettings?.maintenanceModeEnabled && !isAdmin) return <MaintenancePage />;

  if (initialUser && !isAuthPage) return <AppShell>{children}</AppShell>;
  if (!initialUser && isAuthPage) return <>{children}</>;
  if (initialUser && isAuthPage) return loadingScreen;
  if (initialUser && !initialUser.emailVerified && isAuthPage) return <>{children}</>;

  return loadingScreen;
}
