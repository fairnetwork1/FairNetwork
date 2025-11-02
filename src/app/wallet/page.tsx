
'use client'
import React, { useState } from 'react';
import { SendDialog } from '@/components/send-dialog';
import { ReceiveDialog } from '@/components/receive-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowRightLeft, ArrowUp, ArrowDown, Gift, CheckSquare, Pickaxe, History, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFirebase, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const NOTIFICATION_ICONS: { [key: string]: React.ElementType } = {
  send: ArrowUp,
  receive: ArrowDown,
  bonus: Gift,
  reward: CheckSquare,
  mining: Pickaxe,
  default: ArrowRightLeft,
};

const TransactionHistoryDialog = () => {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();

  const transactionsRef = useMemoFirebase(() => user ? query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('timestamp', 'desc')) : null, [user, firestore]);
  const { data: transactionsData, isLoading } = useCollection(transactionsRef);

  const getTxIcon = (type: string) => {
    const Icon = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default;
    const colorClass = type === 'send' ? 'text-red-500' : 'text-green-500';
    return <Icon className={`h-4 w-4 ${colorClass}`} />;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
          <History className="h-4 w-4" />
          Recent Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-black">Recent Activity</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
            <div className="flex flex-col gap-2 pr-4">
                {isLoading ? <p>Loading history...</p> : transactionsData && transactionsData.length > 0 ? (
                    transactionsData.map((tx, index) => (
                        <React.Fragment key={tx.id}>
                        {index > 0 && <Separator />}
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full bg-gray-100`}>
                                {getTxIcon(tx.type)}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-black">{tx.title}</p>
                                <p className="text-xs text-gray-500">
                                {tx.timestamp ? formatDistanceToNow(tx.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                                </p>
                            </div>
                            </div>
                            <div className='text-right'>
                            {tx.amount != null && (
                                <p className={`text-sm font-bold ${tx.type === 'send' ? 'text-red-500' : 'text-green-500'}`}>
                                {tx.type === 'send' ? '' : '+'}{tx.amount.toFixed(2)} Fair
                                </p>
                            )}
                            </div>
                        </div>
                        </React.Fragment>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-4">No transactions yet.</p>
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};


export default function WalletPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  const userRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userData } = useDoc(userRef);
  const isKycVerified = userData?.kycStatus === 'approved';
  
  const verifiedBalance = userData?.verifiedBalance || 0;
  const unverifiedBalance = userData?.unverifiedBalance || 0;
  const totalBalance = verifiedBalance + unverifiedBalance;

  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="grid gap-6">
          <Card 
            className={cn(
                'relative overflow-hidden rounded-2xl border bg-white text-black transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.05)]'
            )}
          >
            <CardHeader className="relative z-10 p-4">
              <CardTitle className='text-gray-500 text-sm font-medium'>Total Balance</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 p-4 pt-0">
              <div className="text-3xl font-bold text-black">
                {(totalBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xl font-medium text-gray-500 ml-2">Fair</span>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-2 gap-4">
            <SendDialog isKycVerified={isKycVerified} currentUserBalance={verifiedBalance} />
            <ReceiveDialog userEmail={user?.email} />
          </div>

           <Card>
            <CardContent className="p-4 space-y-4">
               <div className="flex items-start justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <div>
                        <p className="text-sm font-medium text-green-800">Available to Send (Verified)</p>
                        <p className="text-2xl font-bold text-green-700">
                            {verifiedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex items-start justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div>
                        <p className="text-sm font-medium text-yellow-800">Pending from Referrals (Unverified)</p>
                        <p className="text-2xl font-bold text-yellow-700">
                            {unverifiedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
            </CardContent>
          </Card>

          <TransactionHistoryDialog />
          
        </div>
      </main>
    </div>
  );
}

    