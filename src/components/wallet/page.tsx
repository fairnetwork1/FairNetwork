
'use client'
import React from 'react';
import { SendDialog } from '@/components/send-dialog';
import { ReceiveDialog } from '@/components/receive-dialog';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { ArrowUp, ArrowDown, Gift, CheckSquare, Pickaxe, History, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useFirebase, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';

const NOTIFICATION_ICONS: { [key: string]: React.ElementType } = {
  send: ArrowUp,
  receive: ArrowDown,
  bonus: Gift,
  reward: CheckSquare,
  mining: Pickaxe,
  default: History,
};

const UsdtIcon = () => (
    <div className="h-10 w-10 rounded-full bg-[#26A17B] flex items-center justify-center flex-shrink-0">
        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
            <path d="M9.5 7.5h5v2h-2v7h-2v-7h-3z" fill="#FFF" transform="translate(2.5, 2)" />
        </svg>
    </div>
);

const FairXIcon = () => (
    <div className="h-10 w-10 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white" ><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
    </div>
);


const TransactionHistoryDialog = () => {
  const { user } = useUser();
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
  const usdtBalance = userData?.usdtBalance || 0;
  const fairxBalance = userData?.fairxBalance || 0;

  const referrals = userData?.referrals || {
    verified: 0,
    unverified: 0,
    unverifiedRewards: { usdt: 0, fair: 0 },
    verifiedRewards: { usdt: 0, fair: 0 }
  };


  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(totalBalance);

  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="grid gap-6">
          
          <div className="p-4 bg-white border rounded-lg shadow-sm text-center">
            <p className="text-sm text-gray-500 mb-1">Total Balance</p>
            <p className="text-3xl font-bold tracking-tight text-black">
              {formattedBalance}
              <span className="text-xl font-medium text-gray-700 ml-2">Fair</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SendDialog isKycVerified={isKycVerified} currentUserBalance={verifiedBalance} />
            <ReceiveDialog userEmail={user?.email} />
          </div>

           <Card>
            <CardContent className="p-0">
               <Tabs defaultValue="assets" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="assets">Assets</TabsTrigger>
                    <TabsTrigger value="referral-rewards">Referral Rewards</TabsTrigger>
                  </TabsList>
                  <TabsContent value="assets">
                    <div className="p-4 space-y-1">
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                <Image src="/logo512.png" alt="Fair Chain Logo" width={40} height={40} />
                                <div>
                                    <p className="font-bold text-black">Fair</p>
                                    <p className="text-sm text-gray-500">Fair Chain</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-black">{totalBalance.toFixed(2)}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                <UsdtIcon />
                                <div>
                                    <p className="font-bold text-black">USDT</p>
                                    <p className="text-sm text-gray-500">Tether</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-black">{usdtBalance.toFixed(2)}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                <FairXIcon />
                                <div>
                                    <p className="font-bold text-black">FairX</p>
                                    <p className="text-sm text-gray-500">Points</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-black">{fairxBalance.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="referral-rewards">
                    <Tabs defaultValue="unverified" className="w-full p-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="unverified">Unverified ({referrals.unverified})</TabsTrigger>
                            <TabsTrigger value="verified">Verified ({referrals.verified})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="unverified" className="mt-4">
                            <Card>
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-black">USDT</span>
                                        <span className="font-bold text-black">{(referrals.unverifiedRewards?.usdt || 0).toFixed(2)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-black">Fair</span>
                                        <span className="font-bold text-black">{(referrals.unverifiedRewards?.fair || 0).toFixed(2)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="verified" className="mt-4">
                            <Card>
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-black">USDT</span>
                                        <span className="font-bold text-black">{(referrals.verifiedRewards?.usdt || 0).toFixed(2)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-black">Fair</span>
                                        <span className="font-bold text-black">{(referrals.verifiedRewards?.fair || 0).toFixed(2)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                  </TabsContent>
                </Tabs>
            </CardContent>
          </Card>
          
        </div>
      </main>
    </div>
  );
}
