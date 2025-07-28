'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';

import { BattleCard } from './CardSelector';

interface BattleResultProps {
  battleId: string;
  winnerId: string | null;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
}

export const BattleResult = ({
  battleId,
  winnerId,
  player1Id,
  player2Id,
  player1Name,
  player2Name,
}: BattleResultProps) => {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [explanation, setExplanation] = useState<string>('');
  const [player1Card, setPlayer1Card] = useState<BattleCard | null>(null);
  const [player2Card, setPlayer2Card] = useState<BattleCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBattleDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch battle selections with card details
        const { data: selections, error } = await supabase
          .from('battle_selections')
          .select('*, player_cards(*, cards(*))')
          .eq('battle_id', battleId); // Using battle_id to match renamed column

        if (error) throw error;

        if (selections && selections.length === 2) {
          const p1Selection = selections.find(s => s.player_id === player1Id);
          const p2Selection = selections.find(s => s.player_id === player2Id);
          
          if (p1Selection && p2Selection) {
            // Format cards for display
            setPlayer1Card({
              id: p1Selection.player_card_id,
              name: p1Selection.player_cards.cards.name,
              imageUrl: p1Selection.player_cards.cards.image_url,
              rarity: p1Selection.player_cards.cards.rarity,
              type: p1Selection.player_cards.cards.type,
              attributes: p1Selection.player_cards.cards.attributes || {},
            });
            
            setPlayer2Card({
              id: p2Selection.player_card_id,
              name: p2Selection.player_cards.cards.name,
              imageUrl: p2Selection.player_cards.cards.image_url,
              rarity: p2Selection.player_cards.cards.rarity,
              type: p2Selection.player_cards.cards.type,
              attributes: p2Selection.player_cards.cards.attributes || {},
            });
          }
        }

        // Fetch battle instance for explanation
        const { data: battle } = await supabase
          .from('battle_instances')
          .select('explanation')
          .eq('id', battleId)
          .single();

        if (battle?.explanation) {
          setExplanation(battle.explanation);
        } else {
          // Generate a generic explanation if none exists in the database
          if (winnerId === player1Id) {
            setExplanation(`${player1Name}'s card was stronger and won the battle!`);
          } else if (winnerId === player2Id) {
            setExplanation(`${player2Name}'s card was stronger and won the battle!`);
          } else {
            setExplanation('The battle ended in a draw! No cards were exchanged.');
          }
        }
      } catch (error) {
        console.error('Error fetching battle details:', error);
        toast.error('Failed to load battle results');
      } finally {
        setLoading(false);
      }
    };

    fetchBattleDetails();
  }, [battleId, player1Id, player2Id, supabase, winnerId, player1Name, player2Name]);

  const renderCardDisplay = (card: BattleCard | null, playerName: string) => {
    if (!card) {
      return (
        <div className="w-40 h-56 bg-gray-700 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">Card unavailable</span>
        </div>
      );
    }

    return (
      <div className="relative w-40">
        <div className={`w-40 h-56 bg-gradient-to-b ${getRarityColor(card.rarity)} rounded-lg p-2 shadow-lg`}>
          <div className="bg-gray-800 rounded h-full w-full p-2 flex flex-col">
            <h3 className="text-sm font-bold truncate">{card.name}</h3>
            <div className="text-xs text-gray-400 mb-1">{card.type}</div>
            <div className="flex-grow relative">
              {card.imageUrl ? (
                <div className="h-24 w-full bg-gray-700 rounded overflow-hidden">
                  <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${card.imageUrl})` }} />
                </div>
              ) : (
                <div className="h-24 w-full bg-gray-700 rounded flex items-center justify-center">
                  <span className="text-3xl">🃏</span>
                </div>
              )}
            </div>
            <div className="mt-1 text-xs">
              <div className="flex justify-between">
                <span>STR: {card.attributes?.str || 0}</span>
                <span>DEX: {card.attributes?.dex || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>INT: {card.attributes?.int || 0}</span>
                <span>LCK: {card.attributes?.lck || 0}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center mt-1 font-medium text-sm">{playerName}</div>
      </div>
    );
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common':
        return 'from-gray-500 to-gray-600';
      case 'uncommon':
        return 'from-green-500 to-green-700';
      case 'rare':
        return 'from-blue-500 to-blue-700';
      case 'epic':
        return 'from-purple-500 to-purple-700';
      case 'legendary':
        return 'from-yellow-400 to-yellow-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getResultTitle = () => {
    if (!winnerId) return 'Battle Ended in a Draw!';
    return winnerId === player1Id 
      ? `${player1Name} Won the Battle!` 
      : `${player2Name} Won the Battle!`;
  };

  const getResultClass = () => {
    if (!winnerId) return 'text-yellow-400';
    return winnerId === player1Id ? 'text-green-400' : 'text-red-400';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg">Loading battle results...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
      <h2 className={`text-3xl font-bold mb-6 ${getResultClass()}`}>{getResultTitle()}</h2>
      
      <div className="flex justify-center items-center gap-16 my-8">
        {renderCardDisplay(player1Card, player1Name)}
        <div className="text-4xl font-bold">VS</div>
        {renderCardDisplay(player2Card, player2Name)}
      </div>
      
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <h3 className="text-xl font-semibold mb-2">Battle Explanation</h3>
        <p className="text-lg">{explanation}</p>
      </div>
      
      <Button 
        onClick={() => router.push('/battle')}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-white"
      >
        Return to Battle Lobby
      </Button>
    </div>
  );
};

export default BattleResult;
