
"use client";

import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { ProfileDrawer } from './profile-drawer';
import { NotificationDrawer } from './notification-drawer';

export function Header({ title }: { title: string }) {
  const pathname = usePathname();
  
  // Don't show header on the main auth page
  if (pathname === '/') {
      return null;
  }

  const isHomePage = pathname === '/home';

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-white px-4 sm:px-6">
       {isHomePage ? (
         <>
            <ProfileDrawer>
                <Button variant="outline" size="icon" className="rounded-full h-8 w-8 bg-white">
                    <User className="h-4 w-4" />
                    <span className="sr-only">Open Profile</span>
                </Button>
            </ProfileDrawer>
            <NotificationDrawer />
         </>
       ) : (
         <h1 className="font-semibold text-lg text-black">{title}</h1>
       )}
       
       {!isHomePage && <div className="flex-1"></div>}
       
       <div className="flex items-center">
       </div>
    </header>
  );
}
