'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BattleInstance, BattleSelection } from '@/types/battle';

export interface UseBattleDataReturn {
  battle: BattleInstance | null;
  selection: BattleSelection | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useBattleData = (battleId: string): UseBattleDataReturn => {
  const [battle, setBattle] = useState<BattleInstance | null>(null);
  const [selection, setSelection] = useState<BattleSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  const refresh = useCallback(async () => {
    if (!battleId) {
      setError('Battle ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch battle instance
      const { data: battleData, error: battleError } = await supabase
        .from('battle_instances')
        .select('*')
        .eq('id', battleId)
        .single();

      if (battleError) {
        if (battleError.code === 'PGRST116') {
          throw new Error('Battle not found');
        }
        throw new Error(`Failed to fetch battle: ${battleError.message}`);
      }

      if (!battleData) {
        throw new Error('Battle not found');
      }

      setBattle(battleData);

      // Fetch battle cards and transform to selection format
      const { data: cardsData, error: cardsError } = await supabase
        .from('battle_cards')
        .select('*')
        .eq('battle_id', battleId);

      if (cardsError && cardsError.code !== 'PGRST116') {
        console.warn('Error fetching battle cards:', cardsError);
      }

      // Transform battle_cards data to match BattleSelection interface
      let selectionData: BattleSelection | null = null;
      if (cardsData && cardsData.length > 0) {
        const player1Card = cardsData.find(card => card.player_id === battleData.challenger_id);
        const player2Card = cardsData.find(card => card.player_id === battleData.opponent_id);
        
        selectionData = {
          id: battleId, // Use battle_id as selection id
          battle_id: battleId,
          player1_id: battleData.challenger_id,
          player1_card_id: player1Card?.card_id || null,
          player1_submitted_at: player1Card?.created_at || null,
          player2_id: battleData.opponent_id,
          player2_card_id: player2Card?.card_id || null,
          player2_submitted_at: player2Card?.created_at || null,
          created_at: battleData.created_at,
          updated_at: battleData.updated_at || battleData.created_at,
        };
      }

      setSelection(selectionData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching battle data:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [battleId, supabase]);

  return {
    battle,
    selection,
    loading,
    error,
    refresh,
  };
};