'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CardSelection } from './CardSelection';
import { BattleGrid } from './BattleGrid';
import { BattleResults } from './BattleResults';
import { BattleLobby } from '../../../types/battle';

interface BattleArenaProps {
  initialLobby: BattleLobby;
}

const BattleArena = ({ initialLobby }: BattleArenaProps) => {
  const [lobby, setLobby] = useState<BattleLobby | null>(initialLobby);
  const supabase = createClient();

  useEffect(() => {
    setLobby(initialLobby);
  }, [initialLobby]);

  useEffect(() => {
    if (!lobby?.id) return;

    const channel = supabase
      .channel(`battle:${lobby.id}`)
      .on('broadcast', { event: '*' }, (payload) => {
        console.log('Broadcast received!', payload);
        const newState = payload.payload.newState;
        if (newState) {
          setLobby(newState);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobby?.id, supabase]);

  if (!lobby) {
    return <div className="text-center p-8">Loading battle...</div>;
  }

  const renderBattleState = () => {
    switch (lobby.status) {
      case 'card_selection':
        return <CardSelection lobby={lobby} />;
      case 'in_progress':
        return <BattleGrid lobby={lobby} />;
      case 'finished_player1_won':
      case 'finished_player2_won':
      case 'completed': // Fallback for generic completed status
        return <BattleResults lobby={lobby} onClose={() => setLobby(null)} />;
      case 'pending':
        return <div className="text-center p-8">Waiting for opponent to accept the challenge...</div>;
      default:
        return <div className="text-center p-8">An unexpected error occurred.</div>;
    }
  };

  return (
    <div className="w-full h-full bg-gray-800 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Battle Arena - Lobby: {lobby.id}</h1>
      {renderBattleState()}
    </div>
  );
};

export default BattleArena;
