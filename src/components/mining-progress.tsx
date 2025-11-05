
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser, useMemoFirebase, FirestorePermissionError, errorEmitter, useDoc } from '@/firebase';
import { doc, runTransaction, serverTimestamp, Timestamp, writeBatch, collection, increment, updateDoc } from 'firebase/firestore';
import { Card, CardContent } from './ui/card';
import { Gift, Film, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Logo } from '@/components/icons';
import Image from 'next/image';

type AppSettings = {
    miningReward?: number;
    adsEnabled?: boolean;
    adReward?: number;
};

const MINING_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
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

export function MiningProgress() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userData } = useDoc(userRef);

  const appSettingsRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'app_settings', 'main') : null), [firestore, user]);
  const { data: appSettings } = useDoc<AppSettings>(appSettingsRef);

  const [timeLeft, setTimeLeft] = useState(MINING_DURATION);
  const [isMining, setIsMining] = useState(false);
  const [showAdOffer, setShowAdOffer] = useState(false);
  
  const miningStartedAt = userData?.miningStartedAt as Timestamp | undefined;
  const miningReward = appSettings?.miningReward || 2;

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (miningStartedAt) {
      const startTime = miningStartedAt.toDate().getTime();
      const now = new Date().getTime();
      const timePassed = now - startTime;

      if (timePassed < MINING_DURATION) {
        setIsMining(true);
        setTimeLeft(MINING_DURATION - timePassed);
        
        intervalId = setInterval(() => {
          setTimeLeft(prevTime => {
            if (prevTime <= 1000) {
              setIsMining(false);
              clearInterval(intervalId);
              return 0;
            }
            return prevTime - 1000;
          });
        }, 1000);
      } else {
        setIsMining(false);
        setTimeLeft(0);
      }
    } else {
      setIsMining(false);
      setTimeLeft(MINING_DURATION);
    }
    
    return () => clearInterval(intervalId);
  }, [miningStartedAt]);


  const startMining = () => {
    if (!userRef || !firestore) return;
    
    const payload = { miningStartedAt: serverTimestamp() };

    runTransaction(firestore, async (transaction) => {
      transaction.set(userRef, payload, { merge: true });
    }).then(() => {
      setIsMining(true);
      setTimeLeft(MINING_DURATION);
    }).catch(error => {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'write',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };
  
  const grantMiningReward = async () => {
    if (!userRef || !firestore) return;
     try {
      const batch = writeBatch(firestore);

      batch.update(userRef, {
        verifiedBalance: increment(miningReward),
        miningStartedAt: null,
      });

      const notificationsRef = collection(userRef, 'notifications');
      batch.set(doc(notificationsRef), {
          type: 'reward',
          title: "Mining Reward Claimed",
          description: `You earned +${miningReward} Fair from your mining session.`,
          amount: miningReward,
          isRead: false,
          timestamp: serverTimestamp(),
      });

      await batch.commit();
      
      toast({
        title: "Reward Claimed!",
        description: `You've received ${miningReward} Fair.`,
      });

      setIsMining(false);
      setTimeLeft(MINING_DURATION);
      
      if (appSettings?.adsEnabled) {
          setShowAdOffer(true);
      }

    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'write',
        requestResourceData: { balance: `increment(${miningReward})`, miningStartedAt: null },
      });
      errorEmitter.emit('permission-error', permissionError);

      toast({
        variant: 'destructive',
        title: "Claim Failed",
        description: "Could not claim your reward. Please try again.",
      });
    }
  }

  const grantFairXReward = async () => {
    if (!userRef) return;
    try {
        await updateDoc(userRef, { fairxBalance: increment(3) });
        toast({
            title: 'Ad Bonus!',
            description: `You earned +3 FairX points.`,
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Reward Failed',
            description: 'Could not grant your FairX points.',
        });
    }
  };


  const handleAdCancel = () => {
    setShowAdOffer(false);
  };

  const handleAdContinue = () => {
      setShowAdOffer(false);
      window.open(AD_LINK, '_blank');
      grantFairXReward();
  };

  const formatTimeLeft = (milliseconds: number) => {
    if (milliseconds <= 0) return '00h 00m 00s';
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };
  
  const canClaim = !isMining && timeLeft <= 0 && miningStartedAt;
  const progress = isMining ? ((MINING_DURATION - timeLeft) / MINING_DURATION) * 100 : 0;
  const circumference = 2 * Math.PI * 80; // 2 * pi * r (radius is 80)
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <>
    <Card 
        className="w-full max-w-sm text-center shadow-2xl text-white rounded-3xl border-none relative overflow-hidden"
        style={{
            background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)'
        }}
    >
        <div className="absolute inset-0 texture-dotted-white"></div>
      <CardContent className="space-y-6 p-8 flex flex-col items-center justify-center h-[450px] relative z-10">
        
        <div className="relative flex items-center justify-center">
            {isMining && (
              <div className="absolute inset-0 animate-pulse rounded-full bg-white/20 blur-2xl"></div>
            )}
            <svg className="transform -rotate-90" width="200" height="200" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="80" fill="none" strokeWidth="10" className="stroke-white/20" />
                <circle
                    cx="90"
                    cy="90"
                    r="80"
                    fill="none"
                    strokeWidth="10"
                    className="stroke-current text-white"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.3s' }}
                />
            </svg>
            <div className="absolute">
              <Image src="/logo512.png" alt="Fair Chain Logo" width={96} height={96} className={`${isMining ? 'animate-pulse' : ''}`} />
            </div>
        </div>

        <div className="w-full space-y-2">
            <p className="text-sm text-white/70 h-5 font-mono">
                {isMining ? formatTimeLeft(timeLeft) : (canClaim ? 'Ready to claim!' : 'Session ended.')}
            </p>
            {!miningStartedAt ? (
                <Button
                size="lg"
                className="w-full h-12 text-md bg-white hover:bg-gray-100 text-blue-500 font-bold rounded-xl transition-transform"
                onClick={startMining}
                >
                Start Mining
                </Button>
            ) : (
                <Button
                size="lg"
                className="w-full h-12 text-md font-bold rounded-xl bg-white hover:bg-gray-100 text-blue-500 disabled:opacity-75 disabled:scale-100 transition-all"
                disabled={isMining || !canClaim}
                onClick={grantMiningReward}
                >
                {isMining ? (
                    'Mining...'
                ) : (canClaim ? (
                    <div className='flex items-center'>
                    <Gift className="mr-2 h-5 w-5" />
                    Claim {miningReward} Fair
                    </div>
                    ) : (
                    'Start Mining'
                    )
                )}
                </Button>
            )}
        </div>
      </CardContent>
    </Card>
      <AdRewardDialog 
          open={showAdOffer} 
          onCancel={handleAdCancel}
          onContinue={handleAdContinue}
      />
    </>
  );
}

    
