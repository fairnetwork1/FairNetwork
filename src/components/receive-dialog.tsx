
'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDownCircle, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

export function ReceiveDialog({ userEmail }: { userEmail?: string | null }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    if (!userEmail) return;
    navigator.clipboard.writeText(userEmail).then(() => {
      setCopied(true);
      toast({ title: 'Copied!', description: 'Your email address has been copied.' });
      setTimeout(() => setCopied(false), 2000);
    }, (err) => {
      toast({ variant: 'destructive', title: 'Failed to copy', description: 'Could not copy email.' });
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <Button variant="outline" size="lg" className="h-12 text-base text-black border-gray-300 w-full">
              <ArrowDownCircle className="mr-2" /> Receive
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-black">Receive</DialogTitle>
          <DialogDescription>
            Share your QR code or email address to receive assets.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            {userEmail ? (
                <QRCode value={userEmail} size={160} />
            ) : (
                <Skeleton className="w-[160px] h-[160px]" />
            )}
          </div>
          <div className="w-full space-y-2">
            <Label htmlFor="receive-address" className="text-black text-center block">Your email address</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="receive-address"
                value={userEmail || 'Loading...'}
                readOnly
                className="flex-1 bg-gray-100 text-black border-gray-300"
              />
              <Button type="button" size="icon" onClick={handleCopy} className="text-white" disabled={!userEmail}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
           <Button type="button" onClick={() => setOpen(false)} className="text-white">
              Done
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
