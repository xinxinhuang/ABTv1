'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/types/game';
import { CardDisplay } from '../CardDisplay';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';

const BATTLE_DECK_SIZE = 5;

interface CardSelectionGridProps {
  battleId: string;
  onSelectionConfirmed: (cardId: string) => void;
}

export const CardSelectionGrid = ({ battleId, onSelectionConfirmed }: CardSelectionGridProps) => {
  const { user } = useUser();
  const supabase = createClient();
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayerCards = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Define a type for the player_cards table structure
        type PlayerCard = {
          id: string;
          player_id: string;
          card_name: string;
          card_type: string;
          rarity: string;
          attributes: Record<string, any>;
          obtained_at: string;
        };

        const { data, error } = await supabase
          .from('player_cards')
          .select('*') // Select all columns directly from player_cards
          .eq('player_id', user.id)
          .returns<PlayerCard[]>();

        if (error) throw error;

        // No need for complex mapping or filtering since the data is already in the right format
        const formattedCards: Card[] = data.map(playerCard => ({
          id: playerCard.id,
          player_id: user.id,
          card_name: playerCard.card_name,
          card_type: playerCard.card_type as "humanoid" | "weapon", // Cast to the expected type
          rarity: playerCard.rarity as "bronze" | "silver" | "gold", // Cast to the expected type
          attributes: playerCard.attributes || {},
          obtained_at: playerCard.obtained_at,
        }));
        setAllCards(formattedCards);
      } catch (err: any) {
        setError('Failed to load your card collection.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerCards();
  }, [user, supabase]);

  const handleSelectCard = (cardId: string) => {
    setSelectedCard(prev => (prev === cardId ? null : cardId));
  };

  const handleConfirmSelection = async () => {
    if (!selectedCard || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      console.log('Submitting card selection:', {
        battle_id: battleId,
        player_id: user.id,
        card_id: selectedCard,
      });
      
      // Log the payload for debugging
      console.table({
        battle_id: battleId,
        player_id: user.id,
        card_id: selectedCard
      });
      
      const response = await supabase.functions.invoke('select-card-v2', {
        body: {
          battle_id: battleId,
          player_id: user.id,
          card_id: selectedCard
        },
      });
      
      console.log('Edge Function response:', response);

      // Check for errors in the response
      if (response.error) {
        console.error('Edge Function error:', response.error);
        throw new Error(response.error.message || 'An error occurred');
      }
      
      // Check if the response data has an error property
      if (response.data && response.data.error) {
        console.error('Data error:', response.data.error);
        throw new Error(response.data.error);
      }

      // If we got here, the submission was successful
      console.log('Card selection successful:', response.data);
      if (selectedCard) {
        onSelectionConfirmed(selectedCard);
      }
    } catch (err: any) {
      setError(`Failed to submit card: ${err.message}`);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8"><Loader2 className="mx-auto h-8 w-8 animate-spin" /> Loading your cards...</div>;
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl font-bold text-center mb-4">Select Your Battle Deck ({selectedCard ? 1 : 0}/{BATTLE_DECK_SIZE})</h2>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {allCards.map(card => (
          <div
            key={card.id}
            className={`cursor-pointer border-4 rounded-lg transition-all duration-200 ${
              selectedCard === card.id
                ? 'border-yellow-400 scale-105 shadow-lg'
                : 'border-transparent hover:border-gray-600'
            }`}
            onClick={() => handleSelectCard(card.id)}
          >
            <CardDisplay card={card} isRevealed={true} />
          </div>
        ))}
      </div>
      <div className="text-center">
        <Button 
          onClick={handleConfirmSelection} 
          disabled={isSubmitting || !selectedCard}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
          Confirm Selection
        </Button>
      </div>
    </div>
  );
};
