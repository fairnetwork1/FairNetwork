
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
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, runTransaction, where, query, collection, getDocs, writeBatch, increment, serverTimestamp } from 'firebase/firestore';

type AppSettings = {
    transactionFee?: number;
    minSendAmount?: number;
};

export function SendDialog({ isKycVerified, currentUserBalance }: { isKycVerified: boolean, currentUserBalance: number }) {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [open, setOpen] = useState(false);

  const appSettingsRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'app_settings', 'main') : null), [firestore, user]);
  const { data: appSettings } = useDoc<AppSettings>(appSettingsRef);

  const transactionFee = appSettings?.transactionFee ?? 0.3;
  const minSendAmount = appSettings?.minSendAmount ?? 50;


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
    const totalDebit = amount + transactionFee;

    if (amount < minSendAmount) {
      toast({
        variant: 'destructive',
        title: 'Amount Too Low',
        description: `The minimum amount to send is ${minSendAmount} Fair.`,
      });
      return;
    }

    if (totalDebit > currentUserBalance) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Verified Balance',
        description: 'You do not have enough verified funds to complete this transaction.',
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

            // Decrement sender verified balance
            transaction.update(senderRef, { verifiedBalance: increment(-totalDebit) });
            // Increment recipient verified balance
            transaction.update(recipientRef, { verifiedBalance: increment(amount) });
            // Increment admin wallet
            transaction.set(adminWalletRef, { adminWalletBalance: increment(transactionFee) }, { merge: true });

            // Create notifications for sender and receiver
            const senderNotificationsRef = collection(senderRef, 'notifications');
            transaction.set(doc(senderNotificationsRef), {
                type: 'send',
                title: 'Sent Fair',
                description: `You sent ${amount} Fair to ${recipientEmail}.`,
                amount: -amount,
                isRead: false,
                timestamp: serverTimestamp(),
            });

            const recipientNotificationsRef = collection(recipientRef, 'notifications');
            transaction.set(doc(recipientNotificationsRef), {
                type: 'receive',
                title: 'Received Fair',
                description: `You received ${amount} Fair from ${user.email}.`,
                amount: amount,
                isRead: false,
                timestamp: serverTimestamp(),
            });
        });

        toast({
            title: 'Transaction Successful!',
            description: `You sent ${amount} Fair. Fee: ${transactionFee} Fair.`,
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
        <ArrowUpCircle className="mr-2" /> Send Fair
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {TriggerButton}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className='text-black'>Send Fair Tokens</DialogTitle>
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
              <p>• Only your <span className='font-bold'>Verified Balance</span> can be sent.</p>
              <p>• Minimum send amount: {minSendAmount} Fair.</p>
              <p>• Transaction fee: {transactionFee} Fair.</p>
          </div>
          <DialogFooter className='mt-4'>
            <Button type="submit" className="w-full text-white" disabled={!isKycVerified}>Send Tokens</Button>          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
