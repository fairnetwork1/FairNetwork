
'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, ArrowUp, ArrowDown, Gift, Pickaxe, CheckSquare, FileText } from 'lucide-react';
import { useFirebase, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, writeBatch, doc } from 'firebase/firestore';
import { Separator } from './ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';


type Notification = {
    id: string;
    type: 'send' | 'receive' | 'bonus' | 'reward' | 'mining' | 'kyc';
    title: string;
    description: string;
    amount?: number;
    isRead: boolean;
    timestamp: { toDate: () => Date };
};

const NOTIFICATION_ICONS: { [key: string]: React.ElementType } = {
  send: ArrowUp,
  receive: ArrowDown,
  bonus: Gift,
  reward: CheckSquare,
  mining: Pickaxe,
  kyc: FileText,
};

const NotificationItem = ({ notification }: { notification: Notification }) => {
    const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
    const isCredit = notification.type !== 'send';
    const amountColor = isCredit ? 'text-green-500' : 'text-red-500';

    return (
        <div className="flex items-start gap-4 p-4 hover:bg-gray-50/50">
            {!notification.isRead && (
                 <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
            <div className={cn("flex-shrink-0", notification.isRead && "ml-4")}>
                 <Icon className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-grow">
                <p className="font-semibold text-sm text-black">{notification.title}</p>
                <p className="text-sm text-gray-500">{notification.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(notification.timestamp.toDate(), { addSuffix: true })}
                </p>
            </div>
            {notification.amount != null && (
                 <div className={`text-sm font-bold whitespace-nowrap ${amountColor}`}>
                    {isCredit ? '+' : ''}{notification.amount.toFixed(2)}
                 </div>
            )}
        </div>
    )
}

export function NotificationDrawer() {
  const { firestore, user } = useFirebase();
  const [open, setOpen] = useState(false);
  
  const notificationsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('timestamp', 'desc')) : null,
    [user, firestore]
  );
  
  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);
  
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleMarkAllAsRead = async () => {
    if (!user || !firestore || !notifications || unreadCount === 0) return;
    
    const batch = writeBatch(firestore);
    notifications.forEach(notification => {
        if (!notification.isRead) {
            const notifRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
            batch.update(notifRef, { isRead: true });
        }
    });
    
    await batch.commit();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full w-8 h-8 text-black ml-auto sm:ml-0">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
            )}
            <span className="sr-only">Toggle notifications</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full h-full flex flex-col p-0 sm:max-w-md bg-white">
        <SheetHeader className="text-left p-6 pb-4 border-b">
          <SheetTitle className="text-lg text-black">Notifications</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-grow">
            {isLoading ? (
                 <div className='p-4 space-y-4'>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                 </div>
            ) : notifications && notifications.length > 0 ? (
                <div className='divide-y'>
                    {notifications.map((n, i) => (
                        <NotificationItem key={n.id} notification={n} />
                    ))}
                </div>
            ) : (
                <div className='text-center p-12 text-gray-500'>
                    <p className='font-semibold'>No notifications yet</p>
                    <p className='text-sm'>Your recent activities will appear here.</p>
                </div>
            )}
        </ScrollArea>
        
        <SheetFooter className="p-4 border-t bg-gray-50/50">
          <Button
            onClick={handleMarkAllAsRead}
            variant="outline"
            className="w-full"
            disabled={isLoading || unreadCount === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
