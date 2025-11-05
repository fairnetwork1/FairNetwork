
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { doc, increment, runTransaction } from "firebase/firestore";
import { ArrowRightLeft, Loader2, Star } from "lucide-react";
import { useState, ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons";
import Image from "next/image";

const FAIRX_TO_FAIR_RATE = 0.1; // 10 FairX = 1 Fair
const MINIMUM_SWAP_AMOUNT = 100; // Minimum 100 FairX points

const FairXIcon = () => (
    <div className="h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
        <Star className="h-4 w-4 text-white" fill="white" />
    </div>
);

export default function SwapPage() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userData, isLoading: isUserLoading } = useDoc(userRef);

    const [fairxAmount, setFairxAmount] = useState('');
    const [fairAmount, setFairAmount] = useState('');
    const [isSwapping, setIsSwapping] = useState(false);

    const fairxBalance = userData?.fairxBalance || 0;

    const handleAmountUpdate = (value: string, from: 'fairx' | 'fair') => {
        if (/^\d*\.?\d*$/.test(value)) {
            const numericValue = parseFloat(value);
            if (from === 'fairx') {
                setFairxAmount(value);
                if (!isNaN(numericValue)) {
                    setFairAmount((numericValue * FAIRX_TO_FAIR_RATE).toFixed(2));
                } else {
                    setFairAmount('');
                }
            } else { // from 'fair'
                setFairAmount(value);
                 if (!isNaN(numericValue)) {
                    setFairxAmount((numericValue / FAIRX_TO_FAIR_RATE).toFixed(2));
                } else {
                    setFairxAmount('');
                }
            }
        }
    };
    
    const handleSetMax = () => {
        handleAmountUpdate(String(fairxBalance), 'fairx');
    };

    const handleSwap = async () => {
        if (!user || !userRef) return;
        setIsSwapping(true);

        const amountToSwap = parseFloat(fairxAmount);

        if (isNaN(amountToSwap) || amountToSwap < MINIMUM_SWAP_AMOUNT) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: `Minimum swap amount is ${MINIMUM_SWAP_AMOUNT} FairX.` });
            setIsSwapping(false);
            return;
        }

        if (amountToSwap > fairxBalance) {
            toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'You do not have enough FairX points.' });
            setIsSwapping(false);
            return;
        }

        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) {
                    throw new Error("User document not found.");
                }

                const currentFairXBalance = userDoc.data().fairxBalance || 0;
                if (amountToSwap > currentFairXBalance) {
                    throw new Error("You do not have enough FairX points.");
                }
                
                transaction.update(userRef, {
                    fairxBalance: increment(-amountToSwap),
                    unverifiedBalance: increment(amountToSwap * FAIRX_TO_FAIR_RATE),
                });
            });

            toast({ title: 'Swap Successful!', description: `You swapped ${amountToSwap} FairX for ${fairAmount} Fair.` });
            setFairxAmount('');
            setFairAmount('');

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Swap Failed', description: error.message || 'An unknown error occurred.' });
        } finally {
            setIsSwapping(false);
        }
    };

    const isSwapDisabled = isSwapping || !fairxAmount || parseFloat(fairxAmount) < MINIMUM_SWAP_AMOUNT;

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle className="text-center text-2xl text-black">Swap Points</CardTitle>
                    <CardDescription className="text-center">
                        Convert your FairX points to Fair tokens.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    <div className="p-4 border rounded-lg bg-gray-50 space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="fairx-amount" className="text-black">You sell</Label>
                            <span className="text-xs text-gray-500">
                                Balance: {isUserLoading ? '...' : fairxBalance.toFixed(2)}
                                <Button variant="link" size="sm" className="h-auto p-1 ml-1 text-blue-600" onClick={handleSetMax}>
                                    Max
                                </Button>
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <FairXIcon />
                            <span className="font-bold text-black">FAIRX</span>
                            <Input 
                                id="fairx-amount"
                                type="text"
                                inputMode="decimal"
                                value={fairxAmount}
                                onChange={(e) => handleAmountUpdate(e.target.value, 'fairx')}
                                placeholder="0.00"
                                className="text-right bg-transparent border-none text-xl font-bold text-black focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                        </div>
                    </div>

                     <div className="flex justify-center -my-4 z-10">
                        <div className="p-2 bg-white border rounded-full">
                            <ArrowRightLeft className="h-5 w-5 text-gray-500" />
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-gray-50 space-y-2">
                        <Label htmlFor="fair-amount" className="text-black">You receive</Label>
                        <div className="flex items-center gap-2">
                             <Image src="/logo512.png" alt="Fair Chain Logo" width={24} height={24} />
                            <span className="font-bold text-black">FAIR</span>
                            <Input
                                id="fair-amount"
                                type="text"
                                inputMode="decimal"
                                value={fairAmount}
                                onChange={(e) => handleAmountUpdate(e.target.value, 'fair')}
                                placeholder="0.00"
                                className="text-right bg-transparent border-none text-xl font-bold text-black focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                        </div>
                    </div>
                    
                    <div className="text-center text-sm text-gray-500">
                        <p>10 FairX ≈ 1 Fair</p>
                        <p>Minimum swap amount: {MINIMUM_SWAP_AMOUNT} FairX</p>
                    </div>

                    <Button 
                        className="w-full text-white h-12 text-lg" 
                        disabled={isSwapDisabled}
                        onClick={handleSwap}
                    >
                        {isSwapping ? <Loader2 className="animate-spin" /> : 'Swap'}
                    </Button>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
