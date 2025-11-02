
'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

type KycRequest = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  country: string;
  idFrontImageUrl: string;
  idBackImageUrl: string;
  selfieImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: { toDate: () => Date };
};

type KycApprovalDialogProps = {
  request: KycRequest;
  onAction: (kycRequest: KycRequest, action: 'approve' | 'reject', reason?: string) => Promise<void>;
};

const KycImage = ({ src, alt }: { src: string; alt: string }) => (
  <div className="relative w-full h-64 border rounded-md overflow-hidden">
    <Image src={src} alt={alt} layout="fill" objectFit="contain" />
  </div>
);

export function KycApprovalDialog({ request, onAction }: KycApprovalDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectionAlert, setShowRejectionAlert] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    setIsSubmitting(true);
    await onAction(request, 'approve');
    setIsSubmitting(false);
    setOpen(false);
  };
  
  const handleReject = async () => {
    if (!rejectionReason) {
        // Optionally, show a toast or message that reason is required
        return;
    }
    setIsSubmitting(true);
    await onAction(request, 'reject', rejectionReason);
    setIsSubmitting(false);
    setShowRejectionAlert(false);
    setRejectionReason('');
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Review</Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-white">
          <DialogHeader>
            <DialogTitle>KYC Request Review</DialogTitle>
            <DialogDescription>
              Review the details and documents for{' '}
              <span className="font-semibold">{request.email}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">User Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="font-medium">Full Name:</p>
                  <p>{request.fullName}</p>
                  <p className="font-medium">Country:</p>
                  <p>{request.country}</p>
                  <p className="font-medium">Submitted:</p>
                  <p>{request.submittedAt.toDate().toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Documents</h3>
                <div className="space-y-4">
                    <KycImage src={request.idFrontImageUrl} alt="ID Front" />
                    <KycImage src={request.idBackImageUrl} alt="ID Back" />
                    <KycImage src={request.selfieImageUrl} alt="Selfie" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 flex-shrink-0">
            <Button
              variant="destructive"
              onClick={() => setShowRejectionAlert(true)}
              disabled={isSubmitting}
            >
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showRejectionAlert} onOpenChange={setShowRejectionAlert}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to reject this request?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for the rejection. This will be shown to the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason" className="sr-only">
              Rejection Reason
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="e.g., Selfie is blurry, ID is not clear..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={!rejectionReason || isSubmitting} className="bg-destructive text-destructive-foreground">
              {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
