'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/types/game';
import { fetchCardSafely, fetchBattleCardsSafely, countBattleCardsSafely, fetchPlayerCardsSafely } from '@/lib/supabase/client';
import { determineBattleWinner } from '@/lib/battle/battleLogic';

// Type definitions (can be moved to a central types file later)
interface BattleInstance {
  id: string;
  player1_id: string;
  player2_id: string | null;
  status: 'pending' | 'selecting' | 'active' | 'completed';
  winner_id: string | null;
  created_at: string;
  completed_at: string | null;
  transfer_completed: boolean;
}

interface BattleCard {
  battle_id: string;
  player_id: string;
  card_id: string;
  is_staked: boolean;
  selected_at: string;
}

interface PlayerProfile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface BattleResult {
  winner: 'player1' | 'player2' | 'draw' | null;
  message: string;
}

export const useBattle = (battleId: string) => {
  const router: AppRouterInstance = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [battle, setBattle] = useState<BattleInstance | null>(null);
  const [player1Profile, setPlayer1Profile] = useState<PlayerProfile | null>(null);
  const [player2Profile, setPlayer2Profile] = useState<PlayerProfile | null>(null);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [opponentCard, setOpponentCard] = useState<Card | null | { id: 'selected' }>(null);
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCardSelectionPhase, setIsCardSelectionPhase] = useState(false);
  const [isBattlePhase, setIsBattlePhase] = useState(false);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [isStaking, setIsStaking] = useState(true); // Default to staking

  const handleBattleComplete = useCallback(async (result: BattleResult) => {
    if (!user || !battle || !selectedCard || !opponentCard || opponentCard.id === 'selected') return;

    const winnerId = result.winner === 'player1' ? battle.player1_id : (result.winner === 'player2' ? battle.player2_id : null);
    
    try {
      // Mark battle as completed with winner
      const { error } = await supabase.from('battle_instances').update({
        status: 'completed',
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
      }).eq('id', battle.id);

      if (error) throw error;

      setBattleResult(result);
      toast.success(result.message);

      // Handle card transfer if there was a winner (not a draw)
      if (winnerId) {
        // Get battle cards with staked status
        const { data: battleCards, error: battleCardsError } = await supabase
          .from('battle_cards')
          .select('*')
          .eq('battle_id', battle.id);
          
        if (battleCardsError) {
          console.error('Error fetching battle cards for transfer:', battleCardsError);
          toast.error('Error processing card transfer');
          return;
        }
        
        // Find all staked cards that belong to the loser
        const stakedCards = battleCards?.filter(card => 
          card.is_staked && card.player_id !== winnerId
        ) || [];
        
        console.log(`Found ${stakedCards.length} staked cards to transfer to winner ${winnerId}`);
        
        if (stakedCards.length > 0) {
          // Transfer all staked cards to winner by updating player_cards table
          for (const stakedCard of stakedCards) {
            const { error: transferError } = await supabase
              .from('player_cards')
              .update({ player_id: winnerId })
              .eq('card_id', stakedCard.card_id);
              
            if (transferError) {
              console.error('Failed to transfer card:', transferError);
              toast.error('Error transferring staked card.');
            } else {
              console.log(`Successfully transferred card ${stakedCard.card_id} to winner ${winnerId}`);
            }
          }
          
          // Set transfer_completed flag on battle instance
          await supabase
            .from('battle_instances')
            .update({ transfer_completed: true })
            .eq('id', battle.id);
            
          toast.success('Staked cards transferred to winner!');
        }
      }

    } catch (error) {
      console.error('Error completing battle:', error);
      toast.error('An error occurred while finalizing the battle.');
    }
  }, [battle, user, selectedCard, opponentCard]);

  const fetchBattleAndUser = useCallback(async () => {
    const { data: { session }, } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to fight.');
      router.push('/login');
      return;
    }
    setUser(session.user);

    const { data: initialBattleData, error: battleError } = await supabase.from('battle_instances').select('*').eq('id', battleId).single();
    let battleData = initialBattleData;

    if (battleError || !battleData) {
      toast.error('Battle not found or an error occurred.');
      router.push('/game/arena');
      return;
    }

    // --- State Transition Logic ---
    if (battleData.status === 'pending' && battleData.challenger_id === session.user.id) {
      const { data: updatedBattle, error: updateError } = await supabase.from('battle_instances').update({ status: 'selecting' }).eq('id', battleId).select().single();
      if (updateError || !updatedBattle) {
        toast.error('Failed to start battle selection');
      } else {
        battleData = updatedBattle;
        setBattle(battleData);
      }
    }

    if (battleData.status === 'pending' && battleData.challenger_id !== session.user.id) {
      const { data: updatedBattle, error: updateError } = await supabase.from('battle_instances').update({ opponent_id: session.user.id, status: 'selecting' }).eq('id', battleId).select().single();
      if (updateError || !updatedBattle) {
        toast.error('Failed to join battle');
      } else {
        battleData = updatedBattle;
      }
    }

    if (battleData.status === 'selecting') {
      const count = await countBattleCardsSafely(battleId);
      if (count === 2) {
        const { data: updatedBattle, error: updateError } = await supabase.from('battle_instances').update({ status: 'active' }).eq('id', battleId).select().single();
        if (updateError || !updatedBattle) {
          toast.error('Failed to start battle');
        } else {
          battleData = updatedBattle;
          // Return to allow state to update before proceeding to 'active' phase logic
          return;
        }
      }
    }

    setBattle(battleData);

    // --- Data Fetching Logic ---
    const { data: p1Profile } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', battleData.player1_id).single();
    setPlayer1Profile(p1Profile);

    if (battleData.player2_id) {
      const { data: p2Profile } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', battleData.player2_id).single();
      setPlayer2Profile(p2Profile);
    }

    if (user) {
      try {
        // Use the new helper function to fetch player cards safely
        const fetchedCards = await fetchPlayerCardsSafely(user.id);
        
        if (fetchedCards && fetchedCards.length > 0) {
          // Transform the joined data to match Card type structure
          const transformedCards = fetchedCards.map(item => {
            const cardData = item.cards as any; // Cast to any to access properties
            
            if (!cardData) {
              console.warn('Missing card data for player card:', item.id);
              return null;
            }
            
            const card: Card = {
              id: cardData.id || '',
              player_id: item.player_id,
              card_type: cardData.card_type as 'humanoid' | 'weapon',
              card_name: cardData.card_name || '',
              attributes: cardData.attributes || {},
              rarity: cardData.rarity as 'bronze' | 'silver' | 'gold',
              obtained_at: cardData.obtained_at || new Date().toISOString()
            };
            
            return card;
          }).filter((card): card is Card => card !== null);
          
          console.log('Loaded player cards:', transformedCards.length);
          setPlayerCards(transformedCards);
        } else {
          console.log('No cards found for player');
          setPlayerCards([]);
        }
      } catch (error) {
        console.error('Exception fetching player cards:', error);
        toast.error('Error loading your collection');
      }
    }

    if (battleData.status === 'selecting') {
      setIsCardSelectionPhase(true);
      const battleCards: BattleCard[] = await fetchBattleCardsSafely(battleId);
      if (battleCards) {
        const userBattleCard = battleCards.find((bc: BattleCard) => bc.player_id === session.user.id);
        if (userBattleCard) {
          const card = await fetchCardSafely(userBattleCard.card_id);
          setSelectedCard(card);
        }
        const opponentId = session.user.id === battleData.player1_id ? battleData.player2_id : battleData.player1_id;
        const opponentBattleCard = battleCards.find((bc: BattleCard) => bc.player_id === opponentId);
        if (opponentBattleCard) {
          setOpponentCard({ id: 'selected' });
        }
      }
    } else if (battleData.status === 'active' || battleData.status === 'completed') {
      setIsCardSelectionPhase(false);
      setIsBattlePhase(true);
      const battleCards: BattleCard[] = await fetchBattleCardsSafely(battleId);
      if (battleCards && battleCards.length === 2) {
        const userBattleCard = battleCards.find((bc: BattleCard) => bc.player_id === session.user.id);
        const opponentId = session.user.id === battleData.player1_id ? battleData.player2_id : battleData.player1_id;
        const opponentBattleCard = battleCards.find((bc: BattleCard) => bc.player_id === opponentId);

        if (userBattleCard && opponentBattleCard) {
          const [pCard, oCard] = await Promise.all([
            fetchCardSafely(userBattleCard.card_id),
            fetchCardSafely(opponentBattleCard.card_id),
          ]);
          setSelectedCard(pCard);
          setOpponentCard(oCard);

          if (pCard && oCard && user && battleData.status === 'active') {
            const result = determineBattleWinner(pCard, oCard);
            const battleResultWinner = result.winner === 'draw' ? 'draw' : 
                                     (result.winner === 'challenger' && user.id === battleData.player1_id) || (result.winner === 'opponent' && user.id !== battleData.player1_id) ? 'player1' : 'player2';

            await handleBattleComplete({ winner: battleResultWinner, message: result.message });
          }
        }
      }
    }

    setIsLoading(false);
  }, [battleId, router, handleBattleComplete, user]);

  useEffect(() => {
    fetchBattleAndUser();

    const channel = supabase.channel(`battle-${battleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_instances', filter: `id=eq.${battleId}` }, 
        (payload) => {
          console.log('Battle instance change received!', payload);
          fetchBattleAndUser(); // Refetch all data on any change
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'battle_cards', filter: `battle_id=eq.${battleId}` }, 
        (payload) => {
          console.log('Battle card inserted!', payload);
          fetchBattleAndUser(); // Refetch all data
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId, router]);

  const handleCardSelect = async (cardId: string) => {
    if (!user || !battle || selectedCard) return;
    setIsSubmittingCard(true);
    try {
      const { error } = await supabase.from('battle_cards').insert({
        battle_id: battle.id,
        player_id: user.id,
        card_id: cardId,
        is_staked: isStaking,
      });

      if (error) throw error;

      const card = await fetchCardSafely(cardId);
      setSelectedCard(card);
      toast.success('Card selected! Waiting for opponent.');
    } catch (error) {
      console.error('Error selecting card:', error);
      toast.error('Failed to select card. Please try again.');
    } finally {
      setIsSubmittingCard(false);
    }
  };



  const handleReturnToLobby = () => {
    router.push('/game/arena');
  };

  return {
    user,
    battle,
    player1Profile,
    player2Profile,
    playerCards,
    selectedCard,
    opponentCard,
    isSubmittingCard,
    isLoading,
    isCardSelectionPhase,
    isBattlePhase,
    battleResult,
    handleCardSelect,
    handleReturnToLobby,
    handleBattleComplete,
  };
};
