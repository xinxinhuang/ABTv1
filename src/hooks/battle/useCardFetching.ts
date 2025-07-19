'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/types/game';
import { BattleInstance, BattleSelection } from '@/types/battle';
import { User } from '@supabase/supabase-js';

export interface UseCardFetchingReturn {
  player1Card: Card | null;
  player2Card: Card | null;
  cardsLoading: boolean;
  cardError: string | null;
  refetchCards: () => Promise<void>;
}

export const useCardFetching = (
  battle: BattleInstance | null,
  selection: BattleSelection | null,
  user: User | null
): UseCardFetchingReturn => {
  const [player1Card, setPlayer1Card] = useState<Card | null>(null);
  const [player2Card, setPlayer2Card] = useState<Card | null>(null);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  
  const supabase = createClient();

  const createFallbackCard = useCallback((cardId: string, playerId: string, cardName: string = 'Unknown Card'): Card => {
    return {
      id: cardId,
      player_id: playerId,
      card_name: cardName,
      card_type: 'humanoid',
      attributes: { str: 0, dex: 0, int: 0 },
      rarity: 'bronze',
      obtained_at: new Date().toISOString()
    };
  }, []);

  const fetchCardForPlayer = useCallback(async (
    playerId: string, 
    cardId: string, 
    setter: (card: Card) => void
  ) => {
    if (!cardId || !battle) return;

    try {
      // For completed battles, try to fetch from battle_cards table first
      if (battle.status === 'completed') {
        const { data: battleCardData, error: battleCardError } = await supabase
          .from('battle_cards')
          .select('*')
          .eq('battle_id', battle.id)
          .eq('player_id', playerId)
          .maybeSingle();
        
        if (battleCardData && !battleCardError) {
          // Check if battle_cards has the card details directly stored
          if (battleCardData.card_name && battleCardData.card_type) {
            const card: Card = {
              id: battleCardData.card_id || cardId,
              player_id: playerId,
              card_name: battleCardData.card_name,
              card_type: battleCardData.card_type,
              attributes: battleCardData.card_attributes || { str: 0, dex: 0, int: 0 },
              rarity: battleCardData.rarity || 'bronze',
              obtained_at: battleCardData.created_at || new Date().toISOString()
            };
            setter(card);
            return;
          } else {
            // Fallback: fetch from player_cards using the card_id
            const { data: cardData, error: cardError } = await supabase
              .from('player_cards')
              .select('*')
              .eq('id', battleCardData.card_id)
              .single();
            
            if (cardData && !cardError) {
              setter(cardData);
              return;
            }
          }
        }
      }

      // For active battles or fallback, fetch from player_cards
      // Only fetch if current user owns the card (due to RLS policy)
      if (playerId === user?.id) {
        const { data: cardData, error: cardError } = await supabase
          .from('player_cards')
          .select('*')
          .eq('id', cardId)
          .single();
        
        if (cardData && !cardError) {
          setter(cardData);
          return;
        } else {
          console.warn(`Could not fetch card details for card ${cardId}:`, cardError);
        }
      }

      // Create fallback card for opponent's cards or failed fetches
      const fallbackName = playerId === user?.id ? 'Card Not Found' : 'Hidden Card';
      const fallbackCard = createFallbackCard(cardId, playerId, fallbackName);
      setter(fallbackCard);

    } catch (error) {
      console.error(`Error fetching card ${cardId} for player ${playerId}:`, error);
      const fallbackCard = createFallbackCard(cardId, playerId, 'Error Loading Card');
      setter(fallbackCard);
    }
  }, [battle, user?.id, supabase, createFallbackCard]);

  const refetchCards = useCallback(async () => {
    if (!battle || !selection || !user) {
      setCardError('Missing required data for card fetching');
      return;
    }

    try {
      setCardsLoading(true);
      setCardError(null);

      // Determine which player is player1 and player2 based on battle structure
      const isCurrentUserChallenger = user.id === battle.challenger_id;
      
      // Fetch cards based on selection data
      if (selection.player1_card_id) {
        await fetchCardForPlayer(
          battle.challenger_id, 
          selection.player1_card_id, 
          setPlayer1Card
        );
      }

      if (selection.player2_card_id && battle.opponent_id) {
        await fetchCardForPlayer(
          battle.opponent_id, 
          selection.player2_card_id, 
          setPlayer2Card
        );
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error fetching cards:', error);
      setCardError(errorMessage);
    } finally {
      setCardsLoading(false);
    }
  }, [battle, selection, user, fetchCardForPlayer]);

  // Auto-fetch cards when battle, selection, or user changes
  useEffect(() => {
    if (battle && selection && user && (selection.player1_card_id || selection.player2_card_id)) {
      console.log('Auto-fetching cards due to dependency change');
      refetchCards();
    }
  }, [battle?.id, selection?.player1_card_id, selection?.player2_card_id, user?.id, refetchCards]);

  // Clear cards when battle changes
  useEffect(() => {
    setPlayer1Card(null);
    setPlayer2Card(null);
    setCardError(null);
  }, [battle?.id]);

  return {
    player1Card,
    player2Card,
    cardsLoading,
    cardError,
    refetchCards,
  };
};