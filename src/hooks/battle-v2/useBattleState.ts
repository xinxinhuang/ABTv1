/**
 * useBattleState Hook
 * Manages battle instance data and state for V2 system
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { HumanoidCard, BattleInstance } from '@/types/battle-v2';
import { UseBattleStateReturn } from './types';
import { isHumanoidCard, validateBattleState } from '@/lib/battle-v2/validation';

/**
 * Custom hook for managing battle state
 */
export function useBattleState(battleId: string): UseBattleStateReturn {
  const { user } = useUser();
  const supabase = createClient();
  
  const [battle, setBattle] = useState<BattleInstance | null>(null);
  const [playerCard, setPlayerCard] = useState<HumanoidCard | null>(null);
  const [opponentCard, setOpponentCard] = useState<HumanoidCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch battle instance data
   */
  const fetchBattle = useCallback(async () => {
    if (!battleId || !user) return;

    try {
      setError(null);
      
      const { data: battleData, error: battleError } = await supabase
        .from('battle_instances')
        .select('*')
        .eq('id', battleId)
        .single();

      if (battleError) {
        throw new Error(`Failed to fetch battle: ${battleError.message}`);
      }

      if (!battleData) {
        throw new Error('Battle not found');
      }

      // Validate battle state
      const validation = validateBattleState(battleData);
      if (!validation.valid) {
        throw new Error(`Invalid battle state: ${validation.errors.join(', ')}`);
      }

      // Map to our BattleInstance interface
      const battleInstance: BattleInstance = {
        id: battleData.id,
        created_at: battleData.created_at,
        challenger_id: battleData.challenger_id || battleData.player1_id,
        opponent_id: battleData.opponent_id || battleData.player2_id,
        status: battleData.status,
        winner_id: battleData.winner_id,
        completed_at: battleData.completed_at,
        updated_at: battleData.updated_at
      };

      setBattle(battleInstance);
      
      // Fetch cards if battle is in progress or completed
      if (['cards_revealed', 'in_progress', 'completed'].includes(battleInstance.status)) {
        await fetchBattleCards(battleInstance);
      }

    } catch (err) {
      console.error('Error fetching battle:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch battle');
    }
  }, [battleId, user, supabase]);

  /**
   * Fetch battle cards for both players
   */
  const fetchBattleCards = useCallback(async (battleInstance: BattleInstance) => {
    if (!user) return;

    try {
      // Fetch battle cards
      const { data: battleCards, error: cardsError } = await supabase
        .from('battle_cards')
        .select(`
          *,
          player_cards (
            id,
            player_id,
            card_name,
            card_type,
            attributes,
            rarity,
            obtained_at
          )
        `)
        .eq('battle_id', battleInstance.id);

      if (cardsError) {
        console.error('Error fetching battle cards:', cardsError);
        return;
      }

      if (!battleCards || battleCards.length === 0) {
        return;
      }

      // Process cards and filter for humanoids only
      let userCard: HumanoidCard | null = null;
      let opponentCard: HumanoidCard | null = null;

      battleCards.forEach(battleCard => {
        const cardData = battleCard.player_cards;
        if (!cardData) return;

        // Create card object
        const card = {
          id: cardData.id,
          player_id: cardData.player_id,
          card_name: cardData.card_name,
          card_type: cardData.card_type,
          attributes: cardData.attributes,
          rarity: cardData.rarity,
          obtained_at: cardData.obtained_at
        };

        // Only process humanoid cards
        if (isHumanoidCard(card)) {
          if (battleCard.player_id === user.id) {
            userCard = card;
          } else {
            // Only show opponent card if battle is completed or cards are revealed
            if (['cards_revealed', 'in_progress', 'completed'].includes(battleInstance.status)) {
              opponentCard = card;
            }
          }
        }
      });

      setPlayerCard(userCard);
      setOpponentCard(opponentCard);

    } catch (err) {
      console.error('Error fetching battle cards:', err);
    }
  }, [user, supabase]);

  /**
   * Refresh battle data
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchBattle();
    setLoading(false);
  }, [fetchBattle]);

  // Initial data fetch
  useEffect(() => {
    if (battleId && user) {
      refresh();
    }
  }, [battleId, user, refresh]);

  return {
    battle,
    playerCard,
    opponentCard,
    loading,
    error,
    refresh
  };
}