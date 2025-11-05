
'use client';
import { MiningProgress } from '@/components/mining-progress';

export default function MiningPage() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <MiningProgress />
      </main>
    </div>
  );
}
