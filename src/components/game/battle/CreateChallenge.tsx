'use client';

import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/types/game';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

import { CardSelector, BattleCard } from './CardSelector';

interface CreateChallengeProps {
  opponentId: string;
}

export default function CreateChallenge({ opponentId }: CreateChallengeProps) {
  
  const { toast } = useToast();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedCard, setSelectedCard] = useState<BattleCard | null>(null);
  const [playerCards, setPlayerCards] = useState<BattleCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPlayerCards = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch player cards with their associated card details
        const { data: cardsData, error } = await supabase
          .from('player_cards')
          .select('*, cards(*)')
          .eq('player_id', user.id);

        if (error) throw error;

        console.log('Cards fetched successfully:', cardsData?.length || 0, 'cards found');
        
        // Transform Card objects to BattleCard objects
        const formattedCards: BattleCard[] = (cardsData || []).map((pc: any) => ({
          id: pc.id, // This is player_card_id
          name: pc.cards.name || pc.cards.card_name,
          imageUrl: pc.cards.image_url || '',
          rarity: pc.cards.rarity,
          type: pc.cards.type || pc.cards.card_type,
          attributes: pc.cards.attributes,
        }));
        
        setPlayerCards(formattedCards);

      } catch (error: any) {
        toast({ title: 'Error fetching cards', description: error.message, variant: 'destructive' });
        console.error('Error fetching cards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerCards();
  }, [toast]);

  const handleCardSelect = (card: BattleCard) => {
    setSelectedCard(card);
    setIsSelecting(false);
  };

  const handleCreateCharacter = async () => {
    if (!selectedCard) {
      toast({ title: 'No card selected', description: 'Please select a card to create a challenge.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      if (!opponentId) {
        throw new Error('No opponent specified for the challenge');
      }
      
      // Create the battle instance with challenger_id and opponent_id
      const { data, error } = await supabase.from('battle_instances').insert({
        challenger_id: user.id,
        opponent_id: opponentId,
        status: 'awaiting_opponent',
        winner_id: null,
        completed_at: null,
        transfer_completed: false
      }).select();

      if (error) {
        console.error('Error creating battle instance:', error);
        toast({ title: 'Error creating challenge', description: error.message, variant: 'destructive' });
        return;
      }
      
      // Now create a battle_card entry to link the card to the battle
      const battleId = data[0].id;
      const { error: cardError } = await supabase.from('battle_cards').insert({
        battle_id: battleId,
        player_id: user.id,
        card_id: selectedCard.id,
        is_hidden: false
      });
      
      if (cardError) {
        console.error('Error linking card to battle:', cardError);
        toast({ title: 'Error creating challenge', description: cardError.message, variant: 'destructive' });
        return;
      }
      
      toast({ title: 'Challenge Created!', description: 'Your challenge is now live in the lobby.' });
      setSelectedCard(null);
      // Refresh card list after staking one
      setPlayerCards(prev => prev.filter(c => c.id !== selectedCard.id));
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast({ title: 'Error creating challenge', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  // Add a check for empty player cards
  if (playerCards.length === 0 && !isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="text-center py-6">
          <h3 className="text-lg font-semibold mb-2">No Cards Available</h3>
          <p className="text-gray-500 mb-4">You don't have any cards available for battle.</p>
          <Button onClick={() => window.location.href = '/game/packs'} className="w-full">
            Open Packs to Get Cards
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      {!isSelecting && (
        <div className='flex flex-col items-center gap-4'>
          <Button onClick={() => setIsSelecting(true)} className='w-full'>
            {selectedCard ? 'Change Selection' : 'Select a Card to Battle'}
          </Button>
          {selectedCard && (
            <Button onClick={handleCreateCharacter} disabled={isSubmitting} className='w-full'>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
              Create Challenge with {selectedCard.name}
            </Button>
          )}
        </div>
      )}
      {isSelecting && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Select a Card to Battle</h3>
          <CardSelector 
            cards={playerCards}
            onCardSelect={handleCardSelect}
            selectedCard={selectedCard} 
            isSubmitting={isSubmitting}
            onConfirmSelection={async () => { /* No-op for this component */ }}
          />
          <Button onClick={() => setIsSelecting(false)} variant='ghost' className='w-full mt-4'>Cancel</Button>
        </div>
      )}
    </div>
  );
}
