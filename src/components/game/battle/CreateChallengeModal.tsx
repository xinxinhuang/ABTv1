'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Card } from '@/types/game';
import { supabase, fetchPlayerCardsSafely } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { CardGrid } from '../../game/CardGrid';
import Link from 'next/link';

interface CreateChallengeModalProps {
  onChallengeCreated?: () => void;
}

export function CreateChallengeModal({ onChallengeCreated }: CreateChallengeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPlayerCards();
    }
  }, [isOpen]);

  const fetchPlayerCards = async () => {
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast.error('You must be logged in to create a challenge');
        setIsOpen(false);
        return;
      }

      console.log('Fetching cards for user:', session.user.id);
      
      // Use the new helper function to fetch player cards safely
      const data = await fetchPlayerCardsSafely(session.user.id);
      
      if (!data || data.length === 0) {
        console.log('No cards found for player');
        setPlayerCards([]);
        return;
      }

      console.log('Raw data from query:', data.length, 'cards found');
      
      // Filter and transform data to match Card interface
      const transformedCards = data
        .filter(item => {
          const cardData = item.cards as any;
          return cardData && cardData.card_type === 'humanoid';
        })
        .map(item => {
          const cardData = item.cards as any;
          return {
            id: cardData.id,
            player_id: item.player_id,
            card_type: cardData.card_type as 'humanoid' | 'weapon',
            card_name: cardData.card_name || '',
            attributes: cardData.attributes || {},
            rarity: cardData.rarity as 'bronze' | 'silver' | 'gold',
            obtained_at: cardData.obtained_at || new Date().toISOString()
          };
        });
      
      console.log(`Loaded ${transformedCards.length} humanoid cards for challenge creation`);
      setPlayerCards(transformedCards);
    } catch (error) {
      console.error('Error in fetchPlayerCards:', error);
      toast.error('Error fetching cards: ' + JSON.stringify(error));
      setPlayerCards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardSelect = (card: Card) => {
    setSelectedCard(card === selectedCard ? null : card);
  };

  const createChallenge = async () => {
    if (!selectedCard) {
      toast.error('Please select a card to stake');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast.error('You must be logged in to create a challenge');
        return;
      }
      
      // Create a new battle instance
      // We need to use the same user ID for player2_id initially to satisfy the foreign key constraint
      // This will be updated when another player joins the battle
      const { data: battleData, error: battleError } = await supabase
        .from('battle_instances')
        .insert({
          player1_id: session.user.id,
          player2_id: session.user.id, // Using the same user ID temporarily to satisfy foreign key constraint
          status: 'pending'
        })
        .select()
        .single();
      
      if (battleError || !battleData) {
        toast.error('Failed to create challenge');
        console.error('Error creating battle:', battleError);
        return;
      }
      
      // Add the selected card to the battle
      const { error: cardError } = await supabase
        .from('battle_cards')
        .insert({
          battle_id: battleData.id,
          player_id: session.user.id,
          card_id: selectedCard.id,
          is_staked: true, // Cards always staked
          selected_at: new Date().toISOString()
        });
      
      if (cardError) {
        toast.error('Failed to stake your card');
        console.error('Error staking card:', cardError);
        return;
      }
      
      toast.success('Challenge created successfully!');
      setIsOpen(false);
      if (onChallengeCreated) {
        onChallengeCreated();
      }
    } catch (error) {
      console.error('Error in createChallenge:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Create Challenge
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Battle Challenge</DialogTitle>
          <DialogDescription>
            Select a card to stake in your battle challenge. This card will be hidden from opponents until they accept your challenge.
            If you win, you'll claim your opponent's card and receive a bonus card. If you lose, your opponent will claim this card.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : playerCards.length === 0 ? (
            <div className="text-center py-8">
              <p>You don't have any cards to stake.</p>
              <Link href="/game/packs">
                <Button className="mt-4">Get Cards</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Select a card to stake:</h3>
              <CardGrid 
                cards={playerCards} 
                onCardClick={handleCardSelect} 
                selectedCard={selectedCard}
              />
              
              <div className="mt-4 p-2 bg-red-900/30 border border-red-600/50 rounded-md">
                <p className="text-sm text-red-200">
                  <strong>Note:</strong> Your card will be staked in this battle. If you lose, your opponent will claim it.
                </p>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button 
                  onClick={createChallenge} 
                  disabled={!selectedCard || isCreating}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Challenge'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


