'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '../../../hooks/useUser';
import { BattleInstance, BattleSelection, BattleCard } from '@/types/battle';
import { Card } from '@/types/game';
import { CardDisplay } from '../CardDisplay';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';

interface BattleGridProps {
  battle: BattleInstance;
  selections: BattleSelection[];
}

export const BattleGrid = ({ battle, selections }: BattleGridProps) => {
  const { user } = useUser();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attackerCardId, setAttackerCardId] = useState<string | null>(null);
  const [defenderCardId, setDefenderCardId] = useState<string | null>(null);
  
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [opponentCards, setOpponentCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);

  // Determine player roles
  const isChallenger = user?.id === battle.challenger_id;
  const myId = user?.id || '';
  const opponentId = isChallenger ? (battle.opponent_id || '') : battle.challenger_id;
  const isMyTurn = battle.status === 'in_progress' && ((isChallenger && battle.turn === 'challenger') || (!isChallenger && battle.turn === 'opponent'));

  // No need to fetch battle state since we're getting selections directly from props

  useEffect(() => {
    const fetchCardData = async () => {
      setLoadingCards(true);
      
      console.log('DEBUG BattleGrid: selections:', selections);
      console.log('DEBUG BattleGrid: myId:', myId);
      console.log('DEBUG BattleGrid: opponentId:', opponentId);
      
      if (!selections || selections.length === 0) {
        console.log('DEBUG BattleGrid: No selections found');
        setLoadingCards(false);
        return;
      }

      try {
        // Get my selections and opponent selections
        const mySelections = selections.filter(s => s.player_id === myId);
        const opponentSelections = selections.filter(s => s.player_id === opponentId);
        
        console.log('DEBUG BattleGrid: mySelections:', mySelections);
        console.log('DEBUG BattleGrid: opponentSelections:', opponentSelections);
        
        if (mySelections.length === 0 || opponentSelections.length === 0) {
          // No error here - one or both players may not have selected cards yet
          setLoadingCards(false);
          return;
        }
        
        // Fetch card details for all selected cards
        // Get all card IDs
        const myCardIds = mySelections.map(s => s.player_card_id);
        const opponentCardIds = opponentSelections.map(s => s.player_card_id);
        
        // Fetch my cards
        const { data: myCardsData, error: myError } = await supabase
          .from('player_cards')
          .select('*, cards(*)')
          .in('id', myCardIds);
          
        if (myError) throw myError;
        
        // Fetch opponent cards
        const { data: opponentCardsData, error: opponentError } = await supabase
          .from('player_cards')
          .select('*, cards(*)')
          .in('id', opponentCardIds);
          
        if (opponentError) throw opponentError;

        // Format cards for display
        const myFormattedCards: Card[] = myCardsData.map(cardData => ({
          id: cardData.id,
          player_id: myId || '',
          card_name: cardData.cards.name,
          card_type: cardData.cards.type,
          rarity: cardData.cards.rarity,
          attributes: cardData.cards.attributes || {},
          obtained_at: cardData.obtained_at
        }));

        const opponentFormattedCards: Card[] = opponentCardsData.map(cardData => ({
          id: cardData.id,
          player_id: opponentId || '',
          card_name: cardData.cards.name,
          card_type: cardData.cards.type,
          rarity: cardData.cards.rarity,
          attributes: cardData.cards.attributes || {},
          obtained_at: cardData.obtained_at
        }));

        setMyCards(myFormattedCards);
        setOpponentCards(opponentFormattedCards);
      } catch (err) {
        console.error('Failed to fetch card data:', err);
        setError('Could not load card details.');
      } finally {
        setLoadingCards(false);
      }
    };

    fetchCardData();
  }, [selections, myId, opponentId, supabase]);

  // Function to update battle status in the database
  const updateBattleStatus = async (status: string, winner?: string) => {
    try {
      const updateData: { status: string; winner_id?: string } = { status };
      if (winner) {
        updateData.winner_id = winner;
      }
      
      const { error } = await supabase
        .from('battle_instances')
        .update(updateData)
        .eq('id', battle.id);
        
      if (error) {
        throw new Error(`Failed to update battle status: ${error.message}`);
      }
    } catch (err) {
      console.error('Error updating battle status:', err);
      setError('Failed to update battle status');
    }
  };

  const handlePlayTurn = async () => {
    if (!attackerCardId || !defenderCardId) {
      setError('You must select one of your cards and one opponent card.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const attackerCard = myCards.find(c => c.id === attackerCardId);
      const defenderCard = opponentCards.find(c => c.id === defenderCardId);
      
      if (!attackerCard || !defenderCard) {
        setError('Selected cards not found');
        return;
      }
      
      // Calculate damage based on attributes (simplified example)
      const attackerStrength = attackerCard.attributes?.str || 1;
      const defenderDefense = defenderCard.attributes?.dex || 1;
      const damage = Math.max(5, attackerStrength * 10 - defenderDefense * 5);
      
      // Determine battle outcome based on card attributes
      // This is a simplified example - could be expanded based on game rules
      const myCardPower = attackerStrength * 10;
      const opponentCardPower = defenderDefense * 10;
      
      // Add game log
      console.log(`${attackerCard.card_name} (Power: ${myCardPower}) vs ${defenderCard.card_name} (Power: ${opponentCardPower})`);
      
      // Determine winner and update battle status
      if (myCardPower > opponentCardPower) {
        // Current player wins
        await updateBattleStatus('completed', myId);
      } else if (myCardPower < opponentCardPower) {
        // Opponent wins
        await updateBattleStatus('completed', opponentId);
      } else {
        // It's a tie - resolve based on a random factor
        const winner = Math.random() > 0.5 ? myId : opponentId;
        await updateBattleStatus('completed', winner);
      }
      
      // Clear selections
      setAttackerCardId(null);
      setDefenderCardId(null);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingCards) {
    return <div className="text-center p-8"><Loader2 className="mx-auto h-8 w-8 animate-spin" /> Loading battle...</div>;
  }

  const renderGameStatus = () => {
    if (battle.status === 'completed' && battle.winner_id) {
      const winnerText = battle.winner_id === myId ? 'You won!' : 'You lost!';
      return <div className="text-xl font-bold text-center mb-4">{winnerText}</div>;
    }
    
    return <div className="text-xl font-bold text-center mb-4">
      {isMyTurn ? 'Your turn!' : 'Opponent\'s turn'}
    </div>;
  }

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {error && <p className="text-red-500 text-center">{error}</p>}
      
      {/* Opponent's Side */}
      <div className="flex-1 bg-gray-900 p-4 rounded-lg">
        <h3 className="text-lg font-bold text-red-400">Opponent</h3>
        <div className="flex justify-center items-center space-x-2 mt-2 h-full">
          {opponentCards.map(card => (
            <div key={card.id} onClick={() => isMyTurn && setDefenderCardId(card.id)} className={`p-1 rounded-lg ${defenderCardId === card.id ? 'ring-2 ring-yellow-400' : ''} ${isMyTurn ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <CardDisplay card={card} isRevealed={true} />
            </div>
          ))}
        </div>
      </div>

      {/* Player's Side */}
      <div className="flex-1 bg-gray-900 p-4 rounded-lg">
        <h3 className="text-lg font-bold text-blue-400">You</h3>
        <div className="flex justify-center items-center space-x-2 mt-2 h-full">
          {myCards.map(card => (
            <div key={card.id} onClick={() => isMyTurn && setAttackerCardId(card.id)} className={`p-1 rounded-lg ${attackerCardId === card.id ? 'ring-2 ring-green-400' : ''} ${isMyTurn ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <CardDisplay card={card} isRevealed={true} />
            </div>
          ))}
        </div>
      </div>

      {/* Turn Indicator & Action Button */}
      <div className="text-center">
        <h2 className={`text-2xl font-bold mb-2 ${isMyTurn ? 'text-green-400' : 'text-red-400'}`}>
          {isMyTurn ? 'Your Turn' : 'Opponent\'s Turn'}
        </h2>
        <Button onClick={handlePlayTurn} disabled={!isMyTurn || isSubmitting || !attackerCardId || !defenderCardId}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Attack!
        </Button>
      </div>

      {/* Battle Status */}
      <div className="bg-gray-900 p-4 rounded-lg">
        <h3 className="font-bold mb-2">Battle Status</h3>
        <p>Status: {battle.status}</p>
        <p>Turn: {battle.turn || 'Not started'}</p>
        <p>Challenger: {battle.challenger_id?.slice(0,8)}...</p>
        <p>Opponent: {battle.opponent_id ? battle.opponent_id.slice(0,8) + '...' : 'Waiting...'}</p>
      </div>
    </div>
  );
};
