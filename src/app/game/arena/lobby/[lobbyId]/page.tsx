'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';

import { CardSelector } from '@/components/game/battle/CardSelector';
import { PlayerStatus } from '@/components/game/battle/PlayerStatus';

export default function PreBattleRoomPage() {
  const supabase = createClient();
  const { user } = useUser();
  const { lobbyId } = useParams();
  const [lobbyState, setLobbyState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lobbyId || !user) return;

    // Fetch initial lobby state
    const fetchLobby = async () => {
      const { data, error } = await supabase
        .from('battle_lobbies')
        .select('*, player1:player1_id(username), player2:player2_id(username)')
        .eq('id', lobbyId)
        .single();

      if (error) {
        setError('Lobby not found or an error occurred.');
        return;
      }
      setLobbyState(data);
    };

    fetchLobby();

    // Subscribe to lobby updates
    const channel = supabase.channel(`battle:${lobbyId}`);
    channel
      .on('broadcast', { event: 'state_change' }, (payload: { newState: any }) => {
        setLobbyState(payload.newState);
      })
      .on('broadcast', { event: 'battle_start' }, () => {
        // Navigate to the battlefield
        console.log('Battle is starting!');
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [lobbyId, user, supabase]);

  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!lobbyState) return <div>Loading Pre-Battle Room...</div>;

  const player1 = lobbyState.player1;
  const player2 = lobbyState.player2;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Pre-Battle Room</h1>
      <div className="grid grid-cols-2 gap-8 items-center mb-8">
        <div className="text-center">
          <PlayerStatus name={player1.username} isReady={lobbyState.battle_state?.player1_ready || false} />
        </div>
        <div className="text-center">
          <PlayerStatus name={player2.username} isReady={lobbyState.battle_state?.player2_ready || false} />
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Select Your Cards</h2>
        <CardSelector />
      </div>
    </div>
  );
}
