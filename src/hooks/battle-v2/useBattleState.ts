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
        updated_at: battleData.updated_at,
        explanation: battleData.explanation
      };

      console.log('🔄 Battle fetched with status:', battleInstance.status);
      setBattle(battleInstance);
      
      // Fetch cards for active battles and beyond to check selection status
      const shouldFetchCards = ['active', 'cards_revealed', 'in_progress', 'completed'].includes(battleInstance.status);
      console.log('🔍 Should fetch cards?', shouldFetchCards, 'for status:', battleInstance.status);
      
      if (shouldFetchCards) {
        console.log('🃏 Fetching battle cards for status:', battleInstance.status);
        await fetchBattleCards(battleInstance);
      } else {
        console.log('⏳ Not fetching cards yet, battle status is:', battleInstance.status);
        // Reset selection states for non-active battles
        setPlayerHasSelected(false);
        setOpponentHasSelected(false);
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
      // For completed battles, we need to fetch card data differently since cards may have been transferred
      if (battleInstance.status === 'completed') {
        await fetchCompletedBattleCards(battleInstance);
        return;
      }

      // Fetch battle selections for active battles
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

      // Update selection states based on whether cards exist
      const playerSelected = !!userCardData;
      const opponentSelected = !!opponentCardData;
      
      console.log('🃏 Card selection states from database:', {
        playerSelected,
        opponentSelected,
        userCardData: !!userCardData,
        opponentCardData: !!opponentCardData
      });
      
      setPlayerHasSelected(playerSelected);
      setOpponentHasSelected(opponentSelected);

    } catch (err) {
      console.error('Error fetching battle cards:', err);
    }
  }, [user, supabase]);

  /**
   * Fetch battle cards for completed battles, including transferred cards
   */
  const fetchCompletedBattleCards = useCallback(async (battleInstance: BattleInstance) => {
    if (!user) return;

    try {
      // Get the original battle cards to know which cards were used
      const { data: battleCards, error: cardsError } = await supabase
        .from('battle_cards')
        .select('player_id, card_id')
        .eq('battle_id', battleInstance.id);

      if (cardsError || !battleCards) {
        console.error('Error fetching battle cards:', cardsError);
        // Fall back to regular card fetching if no cards found
        await fetchRegularBattleCards(battleInstance);
        return;
      }

      const userCardEntry = battleCards.find(c => c.player_id === user.id);
      const opponentCardEntry = battleCards.find(c => c.player_id !== user.id);

      if (!userCardEntry || !opponentCardEntry) {
        console.error('Could not find card entries for both players');
        return;
      }

      // For completed battles, we need to fetch cards by their IDs directly
      // The transferred card might now belong to the winner, but we still need to show it
      const cardIds = [userCardEntry.card_id, opponentCardEntry.card_id];
      
      const { data: allCards, error: allCardsError } = await supabase
        .from('player_cards')
        .select('*')
        .in('id', cardIds);

      if (allCardsError || !allCards) {
        console.error('Error fetching cards by IDs:', allCardsError);
        return;
      }

      // Find the cards by matching IDs
      const userCard = allCards.find(c => c.id === userCardEntry.card_id);
      const opponentCard = allCards.find(c => c.id === opponentCardEntry.card_id);

      // Validate and set cards
      let validUserCard: HumanoidCard | null = null;
      if (userCard && isHumanoidCard(userCard)) {
        validUserCard = userCard;
      }

      let validOpponentCard: HumanoidCard | null = null;
      if (opponentCard && isHumanoidCard(opponentCard)) {
        validOpponentCard = opponentCard;
      }

      setPlayerCard(validUserCard);
      setOpponentCard(validOpponentCard);
      setPlayerHasSelected(true);
      setOpponentHasSelected(true);

      console.log('🏁 Completed battle cards fetched:', {
        userCard: !!validUserCard,
        opponentCard: !!validOpponentCard,
        userWon: battleInstance.winner_id === user.id,
        battleExplanation: battleInstance.explanation || 'No explanation available'
      });

    } catch (err) {
      console.error('Error fetching completed battle cards:', err);
    }
  }, [user, supabase]);

  /**
   * Fallback method to fetch battle cards normally
   */
  const fetchRegularBattleCards = useCallback(async (battleInstance: BattleInstance) => {
    if (!user) return;

    try {
      const { data: battleCards, error: cardsError } = await supabase
        .from('battle_cards')
        .select('*, player_cards(*)')
        .eq('battle_id', battleInstance.id);

      if (cardsError || !battleCards) {
        console.error('Error fetching battle cards:', cardsError);
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
        opponentCard = opponentCardData.player_cards;
      }
      
      setPlayerCard(userCard);
      setOpponentCard(opponentCard);
      setPlayerHasSelected(!!userCardData);
      setOpponentHasSelected(!!opponentCardData);

    } catch (err) {
      console.error('Error fetching regular battle cards:', err);
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
      
      // Refresh multiple times to ensure we catch the battle completion
      setTimeout(() => {
        console.log('🔄 First refresh after both submitted');
        refresh();
      }, 1000);
      
      setTimeout(() => {
        console.log('🔄 Second refresh after both submitted');
        refresh();
      }, 3000);
      
      setTimeout(() => {
        console.log('🔄 Third refresh after both submitted');
        refresh();
      }, 6000);
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

  // Periodic refresh for battles that need monitoring
  useEffect(() => {
    if (!battle || !user) return;

    // Set up periodic refresh when both players have selected cards or battle is processing
    const needsMonitoring = (
      battle.status === 'cards_revealed' || 
      battle.status === 'in_progress' ||
      (battle.status === 'active' && playerHasSelected && opponentHasSelected)
    );

    if (needsMonitoring) {
      console.log('🔄 Setting up periodic refresh for battle monitoring, status:', battle.status, 'both selected:', playerHasSelected && opponentHasSelected);
      
      const interval = setInterval(() => {
        console.log('🔄 Periodic refresh triggered for battle resolution');
        refresh();
      }, 3000); // Refresh every 3 seconds for faster resolution detection

      return () => {
        console.log('🔄 Clearing periodic refresh');
        clearInterval(interval);
      };
    }
  }, [battle?.status, playerHasSelected, opponentHasSelected, user, refresh]);

  // Real-time subscription setup
  useEffect(() => {
    if (!battleId || !user) return;

    const channel = supabase.channel(`battle-v2:${battleId}`);

    channel
      .on('broadcast', { event: 'card_selected' }, (event) => {
        console.log('📡 Real-time: card_selected event received');
        handleCardSelectionEvent(event.payload);
      })
      .on('broadcast', { event: 'battle_status_changed' }, (event) => {
        console.log('📡 Real-time: battle_status_changed event received');
        console.log('🔄 Battle status changed:', event.payload);
        console.log('🔄 New status:', event.payload.new_status);
        
        // Add a delay to ensure database updates are complete
        setTimeout(() => {
          refresh();
        }, 1500);
      })
      .on('broadcast', { event: 'battle_resolution_error' }, (event) => {
        console.error('📡 Real-time: battle_resolution_error event received');
        console.error('❌ Battle resolution error:', event.payload);
        // Still refresh to get the latest state
        setTimeout(() => {
          refresh();
        }, 2000);
      })
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'battle_instances', filter: `id=eq.${battleId}` },
        (payload) => {
          console.log('📡 Real-time: battle_instances UPDATE received');
          console.log('🔄 Battle instance updated:', payload);
          if (payload.new?.status !== battle?.status) {
            console.log('🔄 Status changed from', battle?.status, 'to', payload.new?.status);
            setTimeout(() => {
              refresh();
            }, 1000);
          }
        }
      )
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