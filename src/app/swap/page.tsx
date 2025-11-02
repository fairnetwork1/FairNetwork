
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SwapPage() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center text-black">Swap Tokens</CardTitle>
                </CardHeader>
                <CardContent className="text-center p-8 border rounded-lg bg-gray-50/50">
                    <p className='text-gray-500 mb-4'>
                        This feature is coming soon. Please check back later.
                    </p>
                    <Button disabled className="text-white">
                        Swap
                    </Button>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
