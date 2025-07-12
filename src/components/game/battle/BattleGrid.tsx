'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '../../../hooks/useUser';
import { BattleLobby } from '@/types/battle';
import { Card } from '@/types/game';
import { CardDisplay } from '../CardDisplay';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';

interface BattleGridProps {
  lobby: BattleLobby;
}

export const BattleGrid = ({ lobby }: BattleGridProps) => {
  const { user } = useUser();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attackerCardId, setAttackerCardId] = useState<string | null>(null);
  const [defenderCardId, setDefenderCardId] = useState<string | null>(null);
  
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [opponentCards, setOpponentCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);

  const { battle_state } = lobby;
  const isPlayer1 = user?.id === lobby.player1_id;
  const player_key = isPlayer1 ? 'player1' : 'player2';
  const opponent_key = isPlayer1 ? 'player2' : 'player1';
  const isMyTurn = battle_state.turn === player_key;

  useEffect(() => {
    const fetchCardData = async () => {
      setLoadingCards(true);
      const myHandIds = battle_state[`${player_key}_hand`] || [];
      const opponentHandIds = battle_state[`${opponent_key}_hand`] || [];
      const allCardIds = [...myHandIds, ...opponentHandIds];

      if (allCardIds.length === 0) {
        setLoadingCards(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('cards')
          .select('*')
          .in('id', allCardIds);

        if (error) throw error;

        setMyCards(data.filter(card => myHandIds.includes(card.id)));
        setOpponentCards(data.filter(card => opponentHandIds.includes(card.id)));
      } catch (err) {
        console.error('Failed to fetch card data:', err);
        setError('Could not load card details.');
      } finally {
        setLoadingCards(false);
      }
    };

    fetchCardData();
  }, [battle_state, player_key, opponent_key, supabase]);

  const handlePlayTurn = async () => {
    if (!attackerCardId || !defenderCardId) {
      setError('You must select one of your cards and one opponent card.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('play-turn', {
        body: {
          lobby_id: lobby.id,
          move: {
            type: 'attack',
            attacker_card_id: attackerCardId,
            defender_card_id: defenderCardId,
          },
        },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      console.log('Turn played successfully.');
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

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {error && <p className="text-red-500 text-center">{error}</p>}
      
      {/* Opponent's Side */}
      <div className="flex-1 bg-gray-900 p-4 rounded-lg">
        <h3 className="text-lg font-bold text-red-400">Opponent</h3>
        <p>Health: {battle_state[`${opponent_key}_health`]}</p>
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
        <p>Health: {battle_state[`${player_key}_health`]}</p>
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

      {/* Game Log */}
      <div className="bg-gray-900 p-4 rounded-lg h-32 overflow-y-auto">
        <h3 className="font-bold mb-2">Game Log</h3>
        <ul>
          {battle_state.log?.slice().reverse().map((entry, index) => (
            <li key={index} className="text-sm">{entry}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
