
'use client';

import { Logo } from '@/components/icons';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type FairChainCardProps = {
  balance: number;
  className?: string;
};

export function FairChainCard({ balance, className }: FairChainCardProps) {
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(balance);

  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-2xl border-none text-white transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.2)]',
        className
      )}
      style={{
        background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)'
      }}
    >
      <div className="absolute inset-0 texture-dotted-white"></div>
      <CardContent className="relative z-10 flex flex-col justify-between p-6 h-52">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg tracking-wider text-white/90">Fair Chain</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-white/80 mb-1">Total Balance</p>
          <p className="text-4xl lg:text-5xl font-bold tracking-tight text-white">
            {formattedBalance}
            <span className="text-2xl font-medium text-white/80 ml-2">Fair</span>
          </p>
        </div>
        <div className="h-6"></div>
      </CardContent>
    </Card>
  );
}
