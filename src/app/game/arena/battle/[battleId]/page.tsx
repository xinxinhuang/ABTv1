'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useParams } from 'next/navigation';

import { BattleGrid } from '@/components/game/battle/BattleGrid';
import { PlayerHand } from '@/components/game/battle/PlayerHand';
import { GameLog } from '@/components/game/battle/GameLog';
import { BattleInstance, BattleSelection } from '@/types/battle';

export default function BattlePage() {
  const { battleId } = useParams();
  const { user } = useUser();
  const supabase = createClient();
  const [battle, setBattle] = useState<BattleInstance | null>(null);
  const [selections, setSelections] = useState<BattleSelection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!battleId || !user) return;

    const fetchBattleData = async () => {
      try {
        // Fetch the battle instance
        const { data: battleData, error: battleError } = await supabase
          .from('battle_instances')
          .select('*')
          .eq('id', battleId)
          .single();

        if (battleError || !battleData) {
          console.error('Error fetching battle instance:', battleError);
          setLoading(false);
          return;
        }
        
        setBattle(battleData as BattleInstance);

        // Fetch the battle selections
        const { data: selectionsData, error: selectionsError } = await supabase
          .from('battle_selections')
          .select('*')
          .eq('lobby_id', battleId);

        if (selectionsError) {
          console.error('Error fetching battle selections:', selectionsError);
        } else if (selectionsData) {
          setSelections(selectionsData as BattleSelection[]);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error in fetch battle data:', err);
        setLoading(false);
      }
    };

    fetchBattleData();

    // Subscribe to battle instance changes
    const battleChannel = supabase
      .channel(`battle_instance:${battleId}`)
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'battle_instances', filter: `id=eq.${battleId}` }, 
          (payload) => {
            console.log('Battle instance updated:', payload);
            if (payload.new) {
              setBattle(payload.new as BattleInstance);
            }
      })
      .subscribe();
      
    // Subscribe to battle selections changes
    const selectionsChannel = supabase
      .channel(`battle_selections:${battleId}`)
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'battle_selections', filter: `lobby_id=eq.${battleId}` },
          async (payload) => {
            console.log('Battle selection updated:', payload);
            // Fetch all current selections when there's a change
            const { data, error } = await supabase
              .from('battle_selections')
              .select('*')
              .eq('lobby_id', battleId);
              
            if (!error && data) {
              setSelections(data as BattleSelection[]);
            }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(battleChannel);
      supabase.removeChannel(selectionsChannel);
    };
  }, [battleId, user, supabase]);



  if (loading) {
    return <div className="p-4 text-xl font-bold">Loading Battle...</div>;
  }

  if (!battle || !user) {
    return <div className="p-4 text-xl font-bold text-red-500">Battle not found or user not loaded.</div>;
  }

  // Get player cards from selections
  const mySelection = selections.find(s => s.player_id === user.id);
  const playerCards = mySelection ? [mySelection.player_card_id] : [];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Battle Arena - {battle.id}</h1>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-3/4">
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold">Status:</span> {battle.status}
              </div>
              <div>
                <span className="font-semibold">Challenger:</span> {battle.challenger_id?.slice(0,8)}...
              </div>
              <div>
                <span className="font-semibold">Opponent:</span> {battle.opponent_id ? `${battle.opponent_id.slice(0,8)}...` : 'Waiting...'}
              </div>
            </div>
          </div>
          <BattleGrid battle={battle} selections={selections} />
        </div>
        <div className="w-full lg:w-1/4">
          {mySelection && <PlayerHand cards={playerCards} onSelectCard={() => {}} />}
          <GameLog battleState={battle} />
        </div>
      </div>
    </div>
  );
}
