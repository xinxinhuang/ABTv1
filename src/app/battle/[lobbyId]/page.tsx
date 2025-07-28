'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Legacy Battle Page - Redirects to the new battle route
 * 
 * This page handles redirects from the old battle route (/battle/[lobbyId])
 * to the new battle route (/game/arena/battle/[battleId])
 */

export default function BattlePage() {
  const router = useRouter();
  const { lobbyId } = useParams();

  useEffect(() => {
    if (lobbyId) {
      console.log(`Redirecting from legacy battle route to new battle route: /game/arena/battle-v2/${lobbyId}`);
      router.replace(`/game/arena/battle-v2/${lobbyId}`);
    }
  }, [lobbyId, router]);

  return (
    <div className="content-height flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-white mx-auto mb-4"></div>
        <p className="text-xl">Redirecting to new battle page...</p>
      </div>
    </div>
  );
}
