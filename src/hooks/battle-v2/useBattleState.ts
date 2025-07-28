/**
 * useBattleState Hook
 * Manages battle instance data and state for V2 system
 */

import { useState, useEffect, useCallback } from 'react';

import { HumanoidCard, BattleInstance } from '@/types/battle-consolidated';
import { createClient } from '@/lib/supabase/client';
import { isHumanoidCard, validateBattleState } from '@/lib/battle-v2/validation';
import { useUser } from '@/hooks/useUser';

import { UseBattleStateReturn } from './types';

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
  const [playerHasSelected, setPlayerHasSelected] = useState(false);
  const [opponentHasSelected, setOpponentHasSelected] = useState(false);

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

      console.log('🔄 Battle fetched with status:', battleInstance.status);
      setBattle(battleInstance);
      
      // Fetch cards if battle is in progress or completed
      if (['cards_revealed', 'in_progress', 'completed'].includes(battleInstance.status)) {
        console.log('🃏 Fetching battle cards for status:', battleInstance.status);
        await fetchBattleCards(battleInstance);
      } else {
        console.log('⏳ Not fetching cards yet, battle status is:', battleInstance.status);
      }

    } catch (err) {
      console.error('Error fetching battle:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch battle');
    }
  }, [battleId, user, supabase]);

  /**
   * Fetch battle cards for both players from battle_cards table
   */
  const fetchBattleCards = useCallback(async (battleInstance: BattleInstance) => {
    if (!user) return;

    try {
      // Fetch battle selections 
      const { data: battleCards, error: cardsError } = await supabase
        .from('battle_cards')
        .select('*, player_cards(*)')
        .eq('battle_id', battleInstance.id);

      if (cardsError) {
        console.error('Error fetching battle cards:', cardsError);
        return;
      }

      if (!battleCards) {
        console.log('No battle cards found yet');
        return;
      }

      const userCardData = battleCards.find(c => c.player_id === user.id);
      const opponentCardData = battleCards.find(c => c.player_id !== user.id);

      let userCard: HumanoidCard | null = null;
      if (userCardData && userCardData.player_cards && isHumanoidCard(userCardData.player_cards)) {
        userCard = userCardData.player_cards;
      }

      let opponentCard: HumanoidCard | null = null;
      if (opponentCardData && opponentCardData.player_cards && isHumanoidCard(opponentCardData.player_cards)) {
        if (['cards_revealed', 'in_progress', 'completed'].includes(battleInstance.status)) {
            opponentCard = opponentCardData.player_cards;
        }
      }
      
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

  /**
   * Handle real-time updates for card selections
   */
  const handleCardSelectionEvent = useCallback((payload: any) => {
    console.log('🎯 Real-time event received: card_selected', payload);
    console.log('🎯 Current user ID:', user?.id);
    console.log('🎯 Payload player_id:', payload.player_id);
    console.log('🎯 Both submitted:', payload.both_submitted);
    console.log('🎯 Battle status from payload:', payload.battle_status);

    if (payload.player_id === user?.id) {
      console.log('✅ Setting player has selected to true');
      setPlayerHasSelected(true);
    } else {
      console.log('✅ Setting opponent has selected to true');
      setOpponentHasSelected(true);
    }

    // When both players have selected, refresh the battle state
    if (payload.both_submitted) {
      console.log('🚀 Both players have submitted, refreshing battle data...');
      console.log('🚀 Expected new battle status:', payload.battle_status);
      
      // Add a small delay to ensure database updates are complete
      setTimeout(() => {
        refresh();
      }, 1000);
    } else {
      console.log('⏳ Not both submitted yet, current status:', {
        playerHasSelected: payload.player_id === user?.id ? true : playerHasSelected,
        opponentHasSelected: payload.player_id !== user?.id ? true : opponentHasSelected,
        battleStatus: payload.battle_status
      });
    }
  }, [user, refresh, playerHasSelected, opponentHasSelected]);

  /**
   * Select a card for the current user
   */
  const selectCard = useCallback(async (cardId: string) => {
    if (!user || !battle) {
      setError("User or battle not available.");
      return;
    }

    console.log(`Attempting to select card ${cardId} for battle ${battle.id}`);

    try {
      const { data, error } = await supabase.functions.invoke('select-card-v2', {
        body: {
          battle_id: battle.id,
          player_id: user.id,
          card_id: cardId,
        },
      });

      if (error) {
        throw new Error(`Error selecting card: ${error.message}`);
      }

      console.log('Card selected successfully:', data);
      setPlayerHasSelected(true); // Optimistically update UI

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    }
  }, [user, battle, supabase]);

  // Initial data fetch
  useEffect(() => {
    if (battleId && user) {
      refresh();
    }
  }, [battleId, user, refresh]);

  // Periodic refresh for active battles to ensure UI stays in sync
  useEffect(() => {
    if (!battle || !user) return;

    // Only set up periodic refresh for active battles
    if (['active', 'cards_revealed'].includes(battle.status)) {
      console.log('🔄 Setting up periodic refresh for active battle');
      
      const interval = setInterval(() => {
        console.log('🔄 Periodic refresh triggered');
        refresh();
      }, 5000); // Refresh every 5 seconds

      return () => {
        console.log('🔄 Clearing periodic refresh');
        clearInterval(interval);
      };
    }
  }, [battle?.status, user, refresh]);

  // Real-time subscription setup
  useEffect(() => {
    if (!battleId || !user) return;

    const channel = supabase.channel(`battle-v2:${battleId}`);

    channel
      .on('broadcast', { event: 'card_selected' }, (event) => {
        handleCardSelectionEvent(event.payload);
      })
      .on('broadcast', { event: 'battle_status_changed' }, (event) => {
        console.log('🔄 Battle status changed:', event.payload);
        console.log('🔄 New status:', event.payload.new_status);
        
        // Add a delay to ensure database updates are complete
        setTimeout(() => {
          refresh();
        }, 1500);
      })
      .on('broadcast', { event: 'battle_resolution_error' }, (event) => {
        console.error('❌ Battle resolution error:', event.payload);
        // Still refresh to get the latest state
        setTimeout(() => {
          refresh();
        }, 2000);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to battle-v2:${battleId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId, user, supabase, handleCardSelectionEvent, refresh]);

  return {
    battle,
    playerCard,
    opponentCard,
    loading,
    error,
    refresh,
    selectCard,
    playerHasSelected,
    opponentHasSelected,
  };
}