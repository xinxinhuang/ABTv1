'use client';

import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/types/game';
import { createClient } from '@/lib/supabase/client';

import { CardDisplay } from '../CardDisplay';
import { useUser } from '@/hooks/useUser';

interface BattleGridProps {
  battle: BattleInstance;
  player1Card: any;
  player2Card: any;
  onResolveBattle: () => void;
}

export const BattleGrid = ({ battle, player1Card, player2Card, onResolveBattle }: BattleGridProps) => {
  const { user } = useUser();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attackerCardId, setAttackerCardId] = useState<string | null>(null);
  const [defenderCardId, setDefenderCardId] = useState<string | null>(null);
  
  const [myCard, setMyCard] = useState<any>(null);
  const [opponentCard, setOpponentCard] = useState<any>(null);
  const [loadingCards, setLoadingCards] = useState(false);

  // Determine player roles
  const isChallenger = user?.id === battle.challenger_id;
  const myId = user?.id || '';
  const opponentId = isChallenger ? (battle.opponent_id || '') : battle.challenger_id;
  const isMyTurn = battle.status === 'in_progress' && ((isChallenger && battle.turn === 'challenger') || (!isChallenger && battle.turn === 'opponent'));

  useEffect(() => {
    const processCardData = () => {
      console.log('Processing card data:', { player1Card, player2Card });
      
      if (!player1Card || !player2Card) {
        console.log('Missing card data');
        return;
      }

      try {
        // Determine which card belongs to the current user and which to the opponent
        if (isChallenger) {
          // Current user is challenger (player1)
          setMyCard(player1Card);
          setOpponentCard(player2Card);
          setAttackerCardId(player1Card.id);
          setDefenderCardId(player2Card.id);
        } else {
          // Current user is opponent (player2)
          setMyCard(player2Card);
          setOpponentCard(player1Card);
          setAttackerCardId(player1Card.id); // Challenger always attacks first
          setDefenderCardId(player2Card.id);
        }
      } catch (err) {
        console.error('Error processing card data:', err);
        setError('Failed to process card data');
      }
    };
    
    processCardData();
  }, [player1Card, player2Card, isChallenger]);

  const handleResolveBattleClick = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Call the parent's onResolveBattle handler
      await onResolveBattle();
    } catch (err: any) {
      console.error('Error resolving battle:', err);
      setError(err.message || 'Failed to resolve battle');
    } finally {
      setIsSubmitting(false);
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
      const attackerCard = myCard;
      const defenderCard = opponentCard;
      
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
      console.log(`${attackerCard.name} (Power: ${myCardPower}) vs ${defenderCard.name} (Power: ${opponentCardPower})`);
      
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
    return <div className="text-center p-8"><Loader2 className="mx-auto h-8 w-8 animate-spin" /> Loading cards...</div>;
  }
  
  if (!myCard || !opponentCard) {
    return <div className="text-center p-8">Waiting for both players to select their cards...</div>;
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

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {error && <p className="text-red-500 text-center">{error}</p>}
      
      {/* Opponent's Side */}
      <div className="flex-1 bg-gray-900 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Player's card */}
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-2">Your Card</h3>
            <div className="w-full">
              <CardDisplay 
                card={{
                  id: myCard.id,
                  player_id: myId,
                  card_name: myCard.name,
                  card_type: myCard.type,
                  rarity: myCard.rarity,
                  attributes: myCard.attributes || {},
                  obtained_at: new Date().toISOString()
                }} 
                isSelected={true}
              />
            </div>
          </div>
          
          {/* Opponent's card */}
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-2">Opponent's Card</h3>
            <div className="w-full">
              <CardDisplay 
                card={{
                  id: opponentCard.id,
                  player_id: opponentId,
                  card_name: opponentCard.name,
                  card_type: opponentCard.type,
                  rarity: opponentCard.rarity,
                  attributes: opponentCard.attributes || {},
                  obtained_at: new Date().toISOString()
                }} 
                isSelected={true}
              />
            </div>
          </div>
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
        <Button 
          onClick={handleResolveBattleClick} 
          disabled={isSubmitting} 
          className="mt-6 px-6 py-3 text-lg"
        >
          Resolve Battle
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
