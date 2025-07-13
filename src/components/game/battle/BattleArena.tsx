'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CardSelection } from './CardSelection';
import { BattleGrid } from './BattleGrid';
import { BattleResults } from './BattleResults';
import { BattleInstance, BattleSelection } from '../../../types/battle';

interface BattleArenaProps {
  initialLobby: BattleInstance;
}

const BattleArena = ({ initialLobby }: BattleArenaProps) => {
  const [battle, setBattle] = useState<BattleInstance | null>(initialLobby);
  const [selections, setSelections] = useState<BattleSelection[]>([]);
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
            // Fetch all current selections
            const { data, error } = await supabase
              .from('battle_selections')
              .select('*')
              .eq('battle_id', battle.id);
              
            if (!error && data) {
              setSelections(data as BattleSelection[]);
              
              // If we now have selections from both players, update battle status
              if (data.length === 2 && battle.status === 'active') {
                // Both players have selected, update status to cards_revealed
                const { error } = await supabase
                  .from('battle_instances')
                  .update({ status: 'cards_revealed' })
                  .eq('id', battle.id);
                  
                if (error) {
                  console.error('Error updating battle status:', error);
                }
              }
            }
      })
      .subscribe();

    // Initial fetch of selections
    const fetchSelections = async () => {
      const { data, error } = await supabase
        .from('battle_selections')
        .select('*')
        .eq('battle_id', battle.id);
        
      if (!error && data) {
        setSelections(data as BattleSelection[]);
      }
    };
    
    fetchSelections();

    return () => {
      supabase.removeChannel(battleChannel);
      supabase.removeChannel(selectionsChannel);
    };
  }, [battle?.id, supabase]);

  if (!battle) {
    return <div className="text-center p-8">Loading battle...</div>;
  }

  const renderBattleState = () => {
    switch (battle.status) {
      case 'selecting':
      case 'active':
        return <CardSelection lobby={battle} />;
      case 'cards_revealed':
        return (
          <div className="text-center p-8">
            <h2 className="text-xl font-bold mb-4">Cards Revealed!</h2>
            <p>Both players have selected their cards. The battle will be resolved soon.</p>
            <button 
              className="mt-4 px-4 py-2 bg-blue-600 rounded-lg"
              onClick={() => handleResolveBattle()}
            >
              Resolve Battle
            </button>
          </div>
        );
      case 'in_progress':
        return <BattleGrid battle={battle} selections={selections} />;
      case 'completed':
        return <BattleResults battle={battle} selections={selections} onClose={() => setBattle(null)} />;
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
  
  const handleResolveBattle = async () => {
    if (!battle?.id) return;
    
    try {
      const { error } = await supabase.functions.invoke('resolve-battle', {
        body: { battle_id: battle.id }
      });
      
      if (error) throw error;
      console.log('Battle resolved successfully!');
    } catch (error) {
      console.error('Error resolving battle:', error);
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
