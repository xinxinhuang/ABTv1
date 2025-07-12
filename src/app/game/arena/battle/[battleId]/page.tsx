'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useParams } from 'next/navigation';

import { BattleGrid } from '@/components/game/battle/BattleGrid';
import { PlayerHand } from '@/components/game/battle/PlayerHand';
import { GameLog } from '@/components/game/battle/GameLog';

export default function BattlePage() {
  const { battleId } = useParams();
  const { user } = useUser();
  const supabase = createClient();
  const [battleState, setBattleState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!battleId || !user) return;

    const fetchInitialState = async () => {
      const { data, error } = await supabase
        .from('battle_lobbies')
        .select('*')
        .eq('id', battleId)
        .single();

      if (error || !data) {
        console.error('Error fetching battle state:', error);
        // Handle error, e.g., redirect to lobby
      } else {
        setBattleState(data);
      }
      setLoading(false);
    };

    fetchInitialState();

    const channel = supabase.channel(`battle:${battleId}`);

    channel
      .on('broadcast', { event: 'state_change' }, ({ payload }) => {
        console.log('New state received:', payload.newState);
        setBattleState(payload.newState);
      })
      .on('broadcast', { event: 'battle_over' }, ({ payload }) => {
        console.log('Battle over!', payload.newState);
        setBattleState(payload.newState);
        // Handle end of battle UI (e.g., show winner/loser screen)
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.log('Failed to subscribe to battle channel');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId, user, supabase]);

  const handlePlayTurn = async (move: any) => {
    if (!battleState || battleState.status !== 'in_progress') return;

    const { error } = await supabase.functions.invoke('play-turn', {
      body: {
        lobby_id: battleId,
        move,
      },
    });

    if (error) {
      console.error('Error playing turn:', error);
    }
  };

    if (loading) {
    return <div>Loading Battle...</div>;
  }

  if (!battleState || !user) {
    return <div>Battle not found or user not loaded.</div>;
  }

  const isPlayer1 = battleState.player1_id === user.id;
  const playerField = isPlayer1 ? 'player1' : 'player2';
  const playerCards = battleState.battle_state?.[`${playerField}_cards`] || [];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Battle Arena - {battleState.status}</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <BattleGrid battleState={battleState} onPlayTurn={handlePlayTurn} />
        </div>
        <div>
          <PlayerHand cards={playerCards} onSelectCard={() => { /* Placeholder for card selection logic */ }} />
          <GameLog battleState={battleState} />
        </div>
      </div>
    </div>
  );
}
