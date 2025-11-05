
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FairChainCard } from '@/components/fair-chain-card';
import { Gift, Film, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FormEvent, useEffect, useState } from 'react';
import { useFirebase, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { doc, serverTimestamp, runTransaction, Timestamp, getDoc, increment, setDoc, writeBatch, collection, getCountFromServer, query, where, updateDoc } from 'firebase/firestore';
import { ReferralDialog } from '@/components/referral-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

type AppSettings = {
    dailyCheckInReward?: number;
    adsEnabled?: boolean;
    adReward?: number;
};

const AD_LINK = 'https://www.effectivegatecpm.com/k498e6d16?key=abd23761059c1176063b766abf156e6c';

const AdRewardDialog = ({ open, onCancel, onContinue }: { open: boolean, onCancel: () => void, onContinue: () => void }) => (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
        <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-black">
                    <Film className="h-5 w-5 text-blue-500" />
                    Get Extra Points!
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Watch a short ad to get an extra 3 FairX points!
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={onCancel}>No, thanks</AlertDialogCancel>
                <AlertDialogAction onClick={onContinue}>Watch Ad</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);

export default function HomePage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  
  const userRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userRef);

  const appSettingsRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'app_settings', 'main') : null), [firestore, user]);
  const { data: appSettings } = useDoc<AppSettings>(appSettingsRef);
  
  const lastCheckIn = userData?.lastCheckIn as Timestamp | undefined;
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);

  // Ad-related state
  const [showAdOffer, setShowAdOffer] = useState(false);
  const [adRewardContext, setAdRewardContext] = useState<{ type: string; } | null>(null);
  
  useEffect(() => {
    if (lastCheckIn) {
      const checkInTime = lastCheckIn.toDate();
      const interval = setInterval(() => {
        const now = new Date();
        const nextCheckInTime = new Date(checkInTime.getTime() + 24 * 60 * 60 * 1000);
        const diff = nextCheckInTime.getTime() - now.getTime();
        if (diff > 0) {
          setTimeLeft(diff);
        } else {
          setTimeLeft(0);
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(0);
    }
  }, [lastCheckIn]);

  const formatTimeLeft = (milliseconds: number) => {
    if (milliseconds <= 0) return '00h 00m 00s';
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };
  
  const grantReward = async (amount: number, title: string, description: string) => {
        if (!user || !userRef || !firestore) return;
        try {
            const batch = writeBatch(firestore);
            batch.update(userRef, { verifiedBalance: increment(amount) });

            const notificationsRef = collection(userRef, 'notifications');
            batch.set(doc(notificationsRef), {
                type: 'reward',
                title: title,
                description: description,
                amount: amount,
                isRead: false,
                timestamp: serverTimestamp(),
            });

            await batch.commit();

            toast({
                title: 'Reward Claimed!',
                description: `You earned +${amount} Fair.`,
            });
        } catch (error) {
            console.error(`Error granting reward for ${title}:`, error);
            toast({
                variant: 'destructive',
                title: 'Reward Failed',
                description: 'Could not grant your reward. Please try again.',
            });
        }
    };
    
    const grantFairXReward = async () => {
        if (!user || !userRef || !firestore) return;

        try {
            await updateDoc(userRef, { fairxBalance: increment(3) });

            toast({
                title: 'Ad Bonus!',
                description: `You earned +3 FairX points.`,
            });
        } catch (error) {
            console.error(`Error granting FairX reward:`, error);
            toast({
                variant: 'destructive',
                title: 'Reward Failed',
                description: 'Could not grant your FairX points.',
            });
        }
    };


  const handleDailyCheckIn = async () => {
    if (!user || !userRef || !firestore || isClaiming) return;
    setIsClaiming(true);
  
    const reward = appSettings?.dailyCheckInReward || 1;
  
    try {
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User document does not exist!");
        }
  
        const userData = userDoc.data();
        const lastCheckIn = userData.lastCheckIn as Timestamp | undefined;
  
        if (lastCheckIn) {
          const nextCheckInTime = lastCheckIn.toDate().getTime() + 24 * 60 * 60 * 1000;
          if (Date.now() < nextCheckInTime) {
            throw new Error("You have already checked in today.");
          }
        }
  
        transaction.update(userRef, { lastCheckIn: serverTimestamp() });
        transaction.update(userRef, { verifiedBalance: increment(reward) });

        const notificationsRef = collection(userRef, 'notifications');
        transaction.set(doc(notificationsRef), {
            type: 'reward',
            title: 'Daily Check-in',
            description: `You earned +${reward} Fair for your daily check-in.`,
            amount: reward,
            isRead: false,
            timestamp: serverTimestamp(),
        });
      });
  
      toast({
          title: 'Check-in Success!',
          description: `You earned +${reward} Fair.`,
      });

      if (appSettings?.adsEnabled) {
        setAdRewardContext({ type: 'Daily Check-in' });
        setShowAdOffer(true);
      }
  
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Claim Failed',
        description: error.message || 'Could not process your check-in.',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClaimCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) return;

    const form = e.currentTarget;
    const codeInput = form.elements.namedItem('code') as HTMLInputElement;
    const code = codeInput.value.trim().toLowerCase();

    if (!code) {
      toast({ variant: 'destructive', title: 'Invalid Code', description: 'Please enter a code.' });
      return;
    }

    try {
      let rewardAmount = 0;
      await runTransaction(firestore, async (transaction) => {
        const userCodeRef = doc(firestore, 'users', user.uid, 'redeemedCodes', code);
        const userCodeDoc = await transaction.get(userCodeRef);

        if (userCodeDoc.exists()) {
          throw new Error('You have already redeemed this code.');
        }

        const codeRef = doc(firestore, 'dailyCodes', code);
        const codeDoc = await transaction.get(codeRef);

        if (!codeDoc.exists()) {
          throw new Error('Invalid or expired code.');
        }

        const codeData = codeDoc.data();
        if (codeData.validUntil.toDate() < new Date()) {
          throw new Error('This code has expired.');
        }

        transaction.set(userCodeRef, {
          userId: user.uid,
          dailyCodeId: code,
          redeemedAt: serverTimestamp(),
        });
        
        rewardAmount = codeData.rewardAmount;
        const userAccountRef = doc(firestore, 'users', user.uid);
        transaction.update(userAccountRef, { verifiedBalance: increment(rewardAmount) });
        
        const notificationsRef = collection(userAccountRef, 'notifications');
        transaction.set(doc(notificationsRef), {
            type: 'reward',
            title: 'Secret Code Redeemed',
            description: `You received +${rewardAmount} Fair from code: ${code}.`,
            amount: rewardAmount,
            isRead: false,
            timestamp: serverTimestamp(),
        });
      });

      toast({
        title: 'Code Claimed!',
        description: `Your reward of ${rewardAmount} Fair has been added to your wallet.`,
      });
      codeInput.value = '';

      if (appSettings?.adsEnabled) {
        setAdRewardContext({ type: 'Secret Code' });
        setShowAdOffer(true);
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Claim Failed',
        description: error.message || 'Could not claim the code. Please try again.',
      });
    }
  };
  
    const handleAdCancel = () => {
        setShowAdOffer(false);
        setAdRewardContext(null);
    };

    const handleAdContinue = () => {
        setShowAdOffer(false);
        window.open(AD_LINK, '_blank');
        grantFairXReward();
        setAdRewardContext(null);
    };

  const canCheckIn = !isUserDataLoading && timeLeft <= 0;
  
  const verifiedBalance = userData?.verifiedBalance || 0;
  const unverifiedBalance = userData?.unverifiedBalance || 0;
  const totalBalance = verifiedBalance + unverifiedBalance;

  const unverifiedReferrals = userData?.referrals?.unverified || 0;
  const verifiedReferrals = userData?.referrals?.verified || 0;
  const dailyReward = appSettings?.dailyCheckInReward || 1;

  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="grid gap-6">
          <div className="relative">
            <FairChainCard />
          </div>

          <Card>
            <CardHeader className='p-4'>
              <CardTitle className='text-base text-black'>Daily Check-In</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 p-4 pt-0">
               {isUserDataLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : canCheckIn ? (
                <Button
                  className='w-full text-white font-bold py-2.5 transition-all duration-300 transform bg-gradient-to-r from-teal-400 to-blue-500 hover:scale-105'
                  onClick={handleDailyCheckIn}
                  disabled={!canCheckIn || isClaiming}
                >
                  {isClaiming ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Gift className="mr-2 h-5 w-5" />}
                  {isClaiming ? 'Claiming...' : `Claim +${dailyReward} Fair`}
                </Button>
              ) : (
                <div className='text-center text-muted-foreground font-medium text-xs bg-gray-100 px-3 py-1.5 rounded-lg'>
                  Next check-in in: <span className="font-mono">{formatTimeLeft(timeLeft)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-black'>Referral Program</CardTitle>
              <CardDescription>
                Earn 3 Fair for every friend who joins and gets verified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ReferralDialog userId={user?.uid} />
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-2xl font-bold text-black">{unverifiedReferrals}</p>
                  <p className="text-sm text-gray-500">Unverified</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-2xl font-bold text-black">{verifiedReferrals}</p>
                  <p className="text-sm text-gray-500">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className='text-black'>Secret Code</CardTitle>
              <CardDescription>
                Enter the secret code to claim your reward.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleClaimCode} className="flex gap-2">
                <Input name="code" type="text" placeholder="Enter code" className='text-black bg-white border-gray-300' />
                <Button type="submit" className='text-white'>Claim</Button>
              </form>
            </CardContent>
          </Card>

        </div>
      </main>
      
      {adRewardContext && (
        <AdRewardDialog 
          open={showAdOffer} 
          onCancel={handleAdCancel}
          onContinue={handleAdContinue}
        />
      )}
    </div>
  );
}

    