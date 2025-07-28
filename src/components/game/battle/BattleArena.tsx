'use client';

import { useState, useEffect } from 'react';

import { createClient } from '@/lib/supabase/client';

import { BattleGrid } from './BattleGrid';
import { BattleInstance } from '@/types/battle';
import { BattleResults } from './BattleResults';
import { CardSelection } from './CardSelection';
import { useUser } from '@/hooks/useUser';

interface BattleArenaProps {
  initialLobby: BattleInstance;
}

const BattleArena = ({ initialLobby }: BattleArenaProps) => {
  const [battle, setBattle] = useState<BattleInstance | null>(initialLobby);
  const [selection, setSelection] = useState<any>(null);
  const [player1Card, setPlayer1Card] = useState<any>(null);
  const [player2Card, setPlayer2Card] = useState<any>(null);
  const { user } = useUser();
  const supabase = createClient();

  useEffect(() => {
    setBattle(initialLobby);
  }, [initialLobby]);

  useEffect(() => {
    if (!battle?.id) return;

    // Subscribe to battle instance updates
    const battleChannel = supabase
      .channel(`battle_instance:${battle.id}`)
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'battle_instances', filter: `id=eq.${battle.id}` }, 
          (payload) => {
            console.log('Battle instance updated:', payload);
            if (payload.new) {
              setBattle(payload.new as BattleInstance);
            }
      })
      .subscribe();
      
    // Subscribe to battle selection updates
    const selectionsChannel = supabase
      .channel(`battle_selections:${battle.id}`)
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'battle_selections', filter: `battle_id=eq.${battle.id}` },
          async (payload) => {
            console.log('Battle selection updated:', payload);
            // Fetch current selection with card details
            await fetchSelectionWithCards();
      })
      .subscribe();

    // Initial fetch of selection with card details
    const fetchSelectionWithCards = async () => {
      const { data, error } = await supabase
        .from('battle_selections')
        .select(`
          *,
          player1:player1_card_id(id, player_id, card_id, cards:card_id(*)),
          player2:player2_card_id(id, player_id, card_id, cards:card_id(*))
        `)
        .eq('battle_id', battle.id)
        .single();
        
      if (error) {
        if (error.code !== 'PGRST116') { // Not found is expected if no selections yet
          console.error('Error fetching battle selection:', error);
        }
        return;
      }
      
      if (data) {
        console.log('Fetched battle selection with cards:', data);
        setSelection(data);
        
        // Extract card details
        if (data.player1?.cards) {
          setPlayer1Card(data.player1.cards);
        }
        
        if (data.player2?.cards) {
          setPlayer2Card(data.player2.cards);
        }
      }
    };
    
    fetchSelectionWithCards();

    return () => {
      supabase.removeChannel(battleChannel);
      supabase.removeChannel(selectionsChannel);
    };
  }, [battle?.id, supabase]);

  if (!battle) {
    return <div className="text-center p-8">Loading battle...</div>;
  }

  const handleResolveBattle = async (battleId: string) => {
    if (!battleId) return;
    
    try {
      // Call the resolve-battle Edge Function
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resolve-battle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          battle_id: battleId
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to resolve battle');
      }
      
      console.log('Battle resolved:', result);
      
    } catch (error: any) {
      console.error('Error resolving battle:', error);
    }
  };

  const renderBattleState = () => {
    switch (battle.status) {
      case 'selecting':
      case 'active':
        // Check if current user has already selected a card
        const isChallenger = user?.id === battle.challenger_id;
        const hasSelected = isChallenger ? 
          (selection?.player1_card_id ? true : false) : 
          (selection?.player2_card_id ? true : false);
        
        return <CardSelection lobby={battle} />;
      case 'cards_revealed':
        return (
          <div className="flex flex-col items-center space-y-6">
            <h2 className="text-2xl font-bold">Cards Revealed!</h2>
            <BattleGrid 
              battle={battle} 
              player1Card={player1Card}
              player2Card={player2Card}
              onResolveBattle={() => battle?.id && handleResolveBattle(battle.id)} 
            />
          </div>
        );
      case 'in_progress':
        return (
          <div className="flex flex-col items-center space-y-6">
            <h2 className="text-2xl font-bold">Battle in Progress</h2>
            <BattleGrid 
              battle={battle} 
              player1Card={player1Card}
              player2Card={player2Card}
              onResolveBattle={() => battle?.id && handleResolveBattle(battle.id)} 
            />
          </div>
        );
      case 'completed':
        return <BattleResults battle={battle} selections={[selection]} onClose={() => setBattle(null)} />;
      case 'pending':
      case 'awaiting_opponent':
        return <div className="text-center p-8">Waiting for opponent to accept the challenge...</div>;
      case 'cancelled':
      case 'declined':
        return <div className="text-center p-8">This battle has been cancelled or declined.</div>;
      default:
        return <div className="text-center p-8">An unexpected error occurred. Status: {battle.status}</div>;
    }
  };
  


  return (
    <div className="w-full h-full bg-gray-800 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Battle Arena - ID: {battle.id}</h1>
      <div className="mb-4 p-2 bg-gray-700 rounded">
        <div className="flex justify-between">
          <div>
            <span className="font-semibold">Challenger:</span> {battle.challenger_id?.slice(0,8)}...
          </div>
          <div>
            <span className="font-semibold">Opponent:</span> {battle.opponent_id ? `${battle.opponent_id.slice(0,8)}...` : 'Waiting...'}
          </div>
          <div>
            <span className="font-semibold">Status:</span> {battle.status}
          </div>
        </div>
      </div>
      {renderBattleState()}
    </div>
  );
};

export default BattleArena;
