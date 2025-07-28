/**
 * useHumanoidCards Hook
 * Fetches and manages player's humanoid cards for battle selection
 */

import { useState, useEffect, useCallback } from 'react';

import { HumanoidCard } from '@/types/battle-consolidated';
import { createClient } from '@/lib/supabase/client';
import { isHumanoidCard } from '@/lib/battle-v2/validation';
import { useUser } from '@/hooks/useUser';

import { UseHumanoidCardsReturn } from './types';

/**
 * Custom hook for fetching player's humanoid cards
 */
export function useHumanoidCards(): UseHumanoidCardsReturn {
  const { user } = useUser();
  const supabase = createClient();
  
  const [humanoidCards, setHumanoidCards] = useState<HumanoidCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch humanoid cards from database
   */
  const fetchHumanoidCards = useCallback(async () => {
    if (!user) {
      setHumanoidCards([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Query only humanoid cards
      const { data: cardData, error: cardError } = await supabase
        .from('player_cards')
        .select('*')
        .eq('player_id', user.id)
        .eq('card_type', 'humanoid') // Filter for humanoid cards only
        .order('obtained_at', { ascending: false }); // Most recent first

      if (cardError) {
        throw new Error(`Failed to fetch cards: ${cardError.message}`);
      }

      if (!cardData) {
        setHumanoidCards([]);
        return;
      }

      // Validate and filter cards
      const validHumanoidCards: HumanoidCard[] = [];

      cardData.forEach(card => {
        // Double-check that it's a valid humanoid card
        if (isHumanoidCard(card)) {
          validHumanoidCards.push(card);
        } else {
          console.warn('Invalid humanoid card found:', card);
        }
      });

      setHumanoidCards(validHumanoidCards);

      // Log for debugging
      console.log(`Loaded ${validHumanoidCards.length} humanoid cards for battle selection`);

    } catch (err) {
      console.error('Error fetching humanoid cards:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch humanoid cards');
      setHumanoidCards([]);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  /**
   * Refetch cards (useful for refreshing after pack opening)
   */
  const refetch = useCallback(async () => {
    await fetchHumanoidCards();
  }, [fetchHumanoidCards]);

  // Initial fetch
  useEffect(() => {
    fetchHumanoidCards();
  }, [fetchHumanoidCards]);

  // Refetch when user changes
  useEffect(() => {
    if (user) {
      fetchHumanoidCards();
    } else {
      setHumanoidCards([]);
      setLoading(false);
      setError(null);
    }
  }, [user, fetchHumanoidCards]);

  return {
    humanoidCards,
    loading,
    error,
    refetch
  };
}

/**
 * Hook variant that filters cards by rarity
 */
export function useHumanoidCardsByRarity(rarity?: 'bronze' | 'silver' | 'gold'): UseHumanoidCardsReturn {
  const { humanoidCards, loading, error, refetch } = useHumanoidCards();
  
  const [filteredCards, setFilteredCards] = useState<HumanoidCard[]>([]);

  useEffect(() => {
    if (!rarity) {
      setFilteredCards(humanoidCards);
    } else {
      setFilteredCards(humanoidCards.filter(card => card.rarity === rarity));
    }
  }, [humanoidCards, rarity]);

  return {
    humanoidCards: filteredCards,
    loading,
    error,
    refetch
  };
}

/**
 * Hook variant that sorts cards by attribute strength
 */
export function useHumanoidCardsSorted(
  sortBy: 'str' | 'dex' | 'int' | 'total' = 'total'
): UseHumanoidCardsReturn {
  const { humanoidCards, loading, error, refetch } = useHumanoidCards();
  
  const [sortedCards, setSortedCards] = useState<HumanoidCard[]>([]);

  useEffect(() => {
    const sorted = [...humanoidCards].sort((a, b) => {
      if (sortBy === 'total') {
        const aTotal = a.attributes.str + a.attributes.dex + a.attributes.int;
        const bTotal = b.attributes.str + b.attributes.dex + b.attributes.int;
        return bTotal - aTotal; // Descending order
      } else {
        return b.attributes[sortBy] - a.attributes[sortBy]; // Descending order
      }
    });
    
    setSortedCards(sorted);
  }, [humanoidCards, sortBy]);

  return {
    humanoidCards: sortedCards,
    loading,
    error,
    refetch
  };
}