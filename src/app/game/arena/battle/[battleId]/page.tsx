'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { BattleGrid } from '@/components/game/battle/BattleGrid';
import { CardSelectionGrid } from '@/components/game/battle/CardSelectionGrid';
import { GameLog } from '@/components/game/battle/GameLog';
import { BattleInstance, BattleSelection } from '@/types/battle';

export default function BattlePage() {
  const { battleId } = useParams();
  const { user } = useUser();
  const supabase = createClient();
  const [battle, setBattle] = useState<BattleInstance | null>(null);
  const [selections, setSelections] = useState<BattleSelection[]>([]);
  const [loading, setLoading] = useState(true);

  const hasPlayerSelected = useMemo(() => {
    if (!user) return false;
    return selections.some(s => s.player_id === user.id);
  }, [selections, user]);

  const handleSelectionConfirmed = () => {
    // Manually add a placeholder selection to update the UI immediately
    if (user) {
      const placeholderSelection: BattleSelection = {
        id: 'placeholder',
        battle_id: battleId as string,
        player_id: user.id,
        player_card_id: 'placeholder',
        created_at: new Date().toISOString(),
      };
      setSelections(prev => [...prev, placeholderSelection]);
    }
  };

  useEffect(() => {
    if (!battleId || !user) return;

    const fetchBattleData = async () => {
      setLoading(true);
      try {
        const { data: battleData, error: battleError } = await supabase
          .from('battle_instances')
          .select('*')
          .eq('id', battleId)
          .single();

        if (battleError || !battleData) throw new Error('Battle not found');
        setBattle(battleData as BattleInstance);

        const { data: selectionsData, error: selectionsError } = await supabase
          .from('battle_selections')
          .select('*')
          .eq('battle_id', battleId);

        if (selectionsError) throw selectionsError;
        if (selectionsData) setSelections(selectionsData as BattleSelection[]);

      } catch (err) {
        console.error('Error fetching battle data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBattleData();

    const battleChannel = supabase
      .channel(`battle-page:${battleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_instances', filter: `id=eq.${battleId}` }, 
        (payload) => setBattle(payload.new as BattleInstance)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_selections', filter: `battle_id=eq.${battleId}` }, 
        async () => {
          const { data, error } = await supabase.from('battle_selections').select('*').eq('battle_id', battleId);
          if (!error && data) setSelections(data as BattleSelection[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(battleChannel);
    };
  }, [battleId, user, supabase]);

  const renderContent = () => {
    if (loading) {
      return <div className="text-center p-8"><Loader2 className="mx-auto h-12 w-12 animate-spin" /> Loading Battle...</div>;
    }

    if (!battle) {
      return <div className="p-4 text-xl font-bold text-red-500">Battle not found.</div>;
    }

    // Phase 1: Card Selection
    if (battle.status === 'active') {
      if (!hasPlayerSelected) {
        return <CardSelectionGrid battleId={battle.id} onSelectionConfirmed={handleSelectionConfirmed} />;
      }
      return (
        <div className="text-center p-8">
          <Loader2 className="mx-auto h-12 w-12 animate-spin" />
          <h2 className="text-2xl font-bold mt-4">Cards Submitted!</h2>
          <p className="text-gray-400">Waiting for opponent to select their cards...</p>
        </div>
      );
    }

    // Phase 2 & 3: Battle and Completion
    if (battle.status === 'cards_revealed' || battle.status === 'in_progress' || battle.status === 'completed') {
      return <BattleGrid battle={battle} selections={selections} />;
    }

    return <div className="p-4 text-xl font-bold">Unhandled battle status: {battle.status}</div>;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Battle Arena - {battle?.id}</h1>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-3/4">
          {renderContent()}
        </div>
        <div className="w-full lg:w-1/4">
          {battle && <GameLog battleState={battle} />}
        </div>
      </div>
    </div>
  );
}
