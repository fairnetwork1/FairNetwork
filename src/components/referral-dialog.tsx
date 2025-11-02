
'use client';

import { useState } from 'react';
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
import { ArrowRight, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ReferralDialog({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!userId) {
    // Render a disabled button or nothing if there's no user
    return (
      <Button variant="outline" className="w-full text-black border-gray-300" disabled>
        Get Referral Link <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    );
  }

  // Corrected referral link to point to the root page
  const referralLink = `${window.location.origin}/?ref=${userId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      toast({ title: 'Copied!', description: 'Referral link copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    }, (err) => {
      toast({ variant: 'destructive', title: 'Failed to copy', description: 'Could not copy link.' });
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full text-black border-gray-300">
          Get Referral Link <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-black">Share Your Referral Link</DialogTitle>
          <DialogDescription>
            Invite friends to Fair Chain and earn rewards when they get verified.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="referral-link" className="text-black">Your unique link</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="referral-link"
                value={referralLink}
                readOnly
                className="flex-1 bg-gray-100 text-black border-gray-300"
              />
              <Button type="button" size="icon" onClick={handleCopy} className="text-white">
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
