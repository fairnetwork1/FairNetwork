
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUpCircle, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useFirebase, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, runTransaction, where, query, collection, getDocs, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type AppSettings = {
    transactionFee?: number;
    minSendAmount?: number;
    usdtTransactionFee?: number;
    minUsdtSendAmount?: number;
};

type UserData = {
    verifiedBalance?: number;
    usdtBalance?: number;
}

export function SendDialog({ isKycVerified }: { isKycVerified: boolean }) {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [open, setOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState('fair');

  const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userData } = useDoc<UserData>(userRef);
  
  const appSettingsRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'app_settings', 'main') : null), [firestore, user]);
  const { data: appSettings } = useDoc<AppSettings>(appSettingsRef);

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isKycVerified || !user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'KYC Required',
        description: `Please complete KYC verification to send tokens.`,
      });
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount') as string);
    const recipientEmail = (formData.get('email') as string).trim();
    
    const isSendingFair = selectedAsset === 'fair';
    const fee = isSendingFair ? (appSettings?.transactionFee ?? 0.3) : (appSettings?.usdtTransactionFee ?? 0);
    const minAmount = isSendingFair ? (appSettings?.minSendAmount ?? 50) : (appSettings?.minUsdtSendAmount ?? 0);
    const balance = isSendingFair ? (userData?.verifiedBalance ?? 0) : (userData?.usdtBalance ?? 0);
    const assetName = isSendingFair ? 'Fair' : 'USDT';
    
    const totalDebit = amount + fee;

    if (amount < minAmount) {
      toast({
        variant: 'destructive',
        title: 'Amount Too Low',
        description: `The minimum amount to send is ${minAmount} ${assetName}.`,
      });
      return;
    }

    if (totalDebit > balance) {
      toast({
        variant: 'destructive',
        title: `Insufficient ${assetName} Balance`,
        description: `You do not have enough verified ${assetName} to complete this transaction.`,
      });
      return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where("email", "==", recipientEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("Recipient not found.");
            }

            const recipientDoc = querySnapshot.docs[0];
            const senderRef = doc(firestore, 'users', user.uid);
            const recipientRef = recipientDoc.ref;
            const adminWalletRef = doc(firestore, 'app_settings', 'main');

            const balanceField = isSendingFair ? 'verifiedBalance' : 'usdtBalance';

            // Decrement sender balance
            transaction.update(senderRef, { [balanceField]: increment(-totalDebit) });
            // Increment recipient balance
            transaction.update(recipientRef, { [balanceField]: increment(amount) });
            
            // Handle fee for transactions (if any)
            if (fee > 0) {
                transaction.set(adminWalletRef, { adminWalletBalance: increment(fee) }, { merge: true });
            }

            // Create notifications for sender and receiver
            const notificationTitle = `Sent ${assetName}`;
            const notificationDescSender = `You sent ${amount} ${assetName} to ${recipientEmail}.`;
            const notificationDescReceiver = `You received ${amount} ${assetName} from ${user.email}.`;

            const senderNotificationsRef = collection(senderRef, 'notifications');
            transaction.set(doc(senderNotificationsRef), {
                type: 'send',
                title: notificationTitle,
                description: notificationDescSender,
                amount: isSendingFair ? -amount : undefined,
                isRead: false,
                timestamp: serverTimestamp(),
            });

            const recipientNotificationsRef = collection(recipientRef, 'notifications');
            transaction.set(doc(recipientNotificationsRef), {
                type: 'receive',
                title: `Received ${assetName}`,
                description: notificationDescReceiver,
                amount: isSendingFair ? amount : undefined,
                isRead: false,
                timestamp: serverTimestamp(),
            });
        });

        toast({
            title: 'Transaction Successful!',
            description: `You sent ${amount} ${assetName}. ${fee > 0 ? `Fee: ${fee} ${assetName}.` : ''}`,
        });
        setOpen(false);

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Transaction Failed',
            description: error.message || 'Could not complete the transaction.',
        });
    }
  }

  const TriggerButton = (
    <Button size="lg" className="h-12 text-base w-full bg-blue-500 hover:bg-blue-600 text-white">
        <ArrowUpCircle className="mr-2" /> Send
    </Button>
  )
  
  const minAmount = selectedAsset === 'fair' ? (appSettings?.minSendAmount ?? 50) : (appSettings?.minUsdtSendAmount ?? 0);
  const fee = selectedAsset === 'fair' ? (appSettings?.transactionFee ?? 0.3) : (appSettings?.usdtTransactionFee ?? 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {TriggerButton}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className='text-black'>Send</DialogTitle>
          <DialogDescription>
            Internal transfers to other Fair Chain users via email.
          </DialogDescription>
        </DialogHeader>

        {!isKycVerified && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>KYC Verification Required</AlertTitle>
            <AlertDescription>
              You must complete KYC verification before you can send tokens.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSend}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="asset" className="text-right text-black">
                Asset
              </Label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger className="col-span-3 text-black bg-white border-gray-300">
                    <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="usdt">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right text-black">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="recipient@example.com"
                className="col-span-3 text-black bg-white border-gray-300"
                required
                disabled={!isKycVerified}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right text-black">
                Amount
              </Label>
              <Input id="amount" name="amount" type="number" placeholder="0.00" step="0.01" className="col-span-3 text-black bg-white border-gray-300" required disabled={!isKycVerified} />
            </div>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
              <p>• Only KYC-verified users can send tokens.</p>
              {selectedAsset === 'fair' ? (
                <>
                    <p>• Only your <span className='font-bold'>Verified Balance</span> can be sent.</p>
                    <p>• Minimum send amount: {minAmount} Fair.</p>
                    <p>• Transaction fee: {fee} Fair.</p>
                </>
              ) : (
                <>
                    <p>• Minimum send amount: {minAmount} USDT.</p>
                    <p>• Transaction fee: {fee} USDT.</p>
                </>
              )}
          </div>
          <DialogFooter className='mt-4'>
            <Button type="submit" className="w-full text-white" disabled={!isKycVerified}>Send</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    