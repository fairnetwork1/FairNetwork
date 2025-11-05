
'use client';

import { BrandIcon, Logo } from '@/components/icons';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, type Timestamp } from 'firebase/firestore';

type FairChainCardProps = {
  className?: string;
};

export function FairChainCard({ className }: FairChainCardProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();

  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc(userRef);

  const joinDate = (userData?.createdAt as Timestamp)?.toDate().toLocaleDateString();

  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-2xl border-none text-white transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.2)] h-52',
        className
      )}
      style={{
        background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)'
      }}
    >
      <div className="absolute inset-0 texture-dotted-white"></div>
      <CardContent className="relative z-10 flex flex-col justify-between p-6 h-full">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white">Fair Chain</h2>
          <Logo className="h-8 w-8" />
        </div>
        <div className="flex justify-between items-end">
          <div>
            <p className="font-semibold uppercase tracking-wider text-sm text-white/90">
              {userData?.fullName || '...'}
            </p>
            <p className="text-xs text-white/60">
              {joinDate || '...'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
