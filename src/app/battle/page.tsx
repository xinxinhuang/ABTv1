'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/ui/use-toast';

export default function BattleIndexPage() {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Redirect to the game arena where users can see available battles
    toast({ title: 'Battle Arena', description: 'Redirecting to the battle lobby...' });
    router.push('/game/arena/lobby');
  }, [router, toast]);

  return (
    <div className="content-height">
      <div className="container mx-auto p-4 text-white text-center">
        <h1 className="text-3xl font-bold mb-4">Battle Arena</h1>
        <div className="animate-pulse bg-gray-800 p-6 rounded-lg shadow-lg">
          <p className="text-lg mb-4">Redirecting to battle lobby...</p>
          <div className="h-8 bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
