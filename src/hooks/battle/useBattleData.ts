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

      // Fetch battle selection
      const { data: selectionData, error: selectionError } = await supabase
        .from('battle_selections')
        .select('*')
        .eq('battle_id', battleId)
        .maybeSingle();

      if (selectionError && selectionError.code !== 'PGRST116') {
        console.warn('Error fetching battle selection:', selectionError);
        // Don't throw here as selection might not exist yet for active battles
      }

      setSelection(selectionData || null);

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