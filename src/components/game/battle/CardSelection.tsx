'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '../../../hooks/useUser';
import { Card, CardAttributes } from '@/types/game';
import { BattleInstance, BattleSelection, BattleCard } from '@/types/battle';
import { CardDisplay } from '../CardDisplay';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BATTLE_DECK_SIZE = 1; // We're only selecting one card per player now

interface CardSelectionProps {
  lobby: BattleInstance;
  playerCards?: BattleCard[];
}

export function CardSelection({ lobby, playerCards: providedPlayerCards }: CardSelectionProps) {
  const { user } = useUser();
  const supabase = createClient();
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSelected, setHasSelected] = useState(false);
  const [opponentHasSelected, setOpponentHasSelected] = useState(false);

  // Check if current player has already made a card selection for this battle
  useEffect(() => {
    if (!user || !lobby.id) return;
    
    const checkExistingSelection = async () => {
      try {
        console.log('Checking if player has already selected cards for battle:', lobby.id);
        const { data: selection, error } = await supabase
          .from('battle_selections')
          .select('*')
          .eq('battle_id', lobby.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found' which is expected if no selections yet
          throw error;
        }
          
        if (selection) {
          // Check if current player has already selected
          const isChallenger = user.id === lobby.challenger_id;
          
          if (isChallenger && selection.player1_card_id) {
            console.log('Player 1 has already selected a card:', selection.player1_card_id);
            setHasSelected(true);
          } else if (!isChallenger && selection.player2_card_id) {
            console.log('Player 2 has already selected a card:', selection.player2_card_id);
            setHasSelected(true);
          }
          
          // Check if opponent has selected
          if (isChallenger && selection.player2_card_id) {
            console.log('Opponent (Player 2) has selected a card');
            setOpponentHasSelected(true);
          } else if (!isChallenger && selection.player1_card_id) {
            console.log('Opponent (Player 1) has selected a card');
            setOpponentHasSelected(true);
          }
        }
      } catch (err) {
        console.error('Error checking card selections:', err);
      }
    };
    
    checkExistingSelection();
  }, [lobby.id, user, supabase, lobby.challenger_id, lobby.opponent_id]);

  useEffect(() => {
    // If playerCards are provided from the parent, use them instead of fetching
    if (providedPlayerCards && providedPlayerCards.length > 0) {
      console.log('Using provided player cards:', providedPlayerCards);
      // Convert BattleCard to Card format if needed
      const formattedCards = providedPlayerCards.map(battleCard => {
        // Convert rarity to expected format (bronze, silver, gold)
        let normalizedRarity: "bronze" | "silver" | "gold" = "bronze";
        if (battleCard.rarity.toLowerCase().includes("silver")) {
          normalizedRarity = "silver";
        } else if (battleCard.rarity.toLowerCase().includes("gold")) {
          normalizedRarity = "gold";
        }
        
        const card: Card = {
          id: battleCard.id,
          player_id: user?.id || '',  // Use current user's ID
          card_name: battleCard.name,
          card_type: battleCard.type as 'humanoid' | 'weapon',
          rarity: normalizedRarity,
          attributes: battleCard.attributes as CardAttributes || {},
          obtained_at: new Date().toISOString() // Use current date as fallback
        };
        return card;
      });
      setCards(formattedCards);
      setLoading(false);
      return;
    }
    
    // Otherwise fetch cards as before
    const fetchUserCards = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('player_cards')
          .select('*, cards(*)')
          .eq('player_id', user.id);

        if (error) throw error;
        
        const fetchedCards = data.map(item => item.cards) as Card[];
        setCards(fetchedCards);
        console.log('Fetched player cards from database:', fetchedCards);
      } catch (err: any) {
        setError('Failed to fetch your cards. Please try again.');
        console.error('Error fetching cards:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCards();
  }, [user, supabase, providedPlayerCards]);

  const handleCardSelect = (card: Card) => {
    setSelectedCards(prev => {
      if (prev.find(c => c.id === card.id)) {
        return prev.filter(c => c.id !== card.id);
      }
      if (prev.length < BATTLE_DECK_SIZE) {
        return [...prev, card];
      }
      return prev;
    });
  };

  const handleSubmitSelection = async () => {
    if (selectedCards.length !== BATTLE_DECK_SIZE) {
      setError(`You must select exactly ${BATTLE_DECK_SIZE} card.`);
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      if (!user) throw new Error('You must be logged in to select a card');
      
      // Use the new Edge Function to submit the card selection
      const selectedCard = selectedCards[0]; // We're only selecting one card now
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/select-card-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          battle_id: lobby.id,
          selected_card_id: selectedCard.id,
          user_id: user.id
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit card selection');
      }
      
      console.log('Card selection response:', result);
      
      // Update local state to show the user has made their selection
      setHasSelected(true);
      
      // If both players have now selected their cards, the status will be updated by the Edge Function
      if (result.status === 'cards_revealed') {
        setOpponentHasSelected(true);
        toast.success('Both players have selected their cards. The battle will begin!');
      } else {
        toast.success('Card selected successfully. Waiting for opponent...');
      }

    } catch (err: any) {
      setError(err.message);
      console.error('Error submitting card selection:', err);
      toast.error(err.message || 'Failed to submit card selection');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8"><Loader2 className="mx-auto h-8 w-8 animate-spin" /> Fetching your cards...</div>;
  }
  
  if (error) {
     return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  const isChallenger = user?.id === lobby.challenger_id;

  if (hasSelected) {
    return <div className="text-center p-8">You've selected your cards. Waiting for the other player to select their cards...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Select Your Battle Deck ({selectedCards.length}/{BATTLE_DECK_SIZE})</h2>
      <div className="p-4 bg-gray-900 rounded-lg min-h-[100px]">
        <div className="grid grid-cols-5 gap-2">
            {selectedCards.map(card => (
                <div key={card.id} onClick={() => handleCardSelect(card)} className="cursor-pointer">
                    <CardDisplay card={card} isRevealed={true} />
                </div>
            ))}
            {Array(BATTLE_DECK_SIZE - selectedCards.length).fill(0).map((_, i) => (
                <div key={i} className="w-full h-full bg-gray-700 rounded-md aspect-[2.5/3.5] flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Empty</span>
                </div>
            ))}
        </div>
      </div>
      
      <Button onClick={handleSubmitSelection} disabled={isSubmitting || selectedCards.length !== BATTLE_DECK_SIZE}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Ready for Battle
      </Button>

      <CardCollection cards={cards} onCardSelect={handleCardSelect} selectedCards={selectedCards} />
    </div>
  );
}

function CardCollection({ cards, onCardSelect, selectedCards }: { cards: Card[], onCardSelect: (card: Card) => void, selectedCards: Card[] }) {
  const [cardFilter, setCardFilter] = useState<'all' | 'space-marine' | 'galactic-ranger' | 'void-sorcerer'>('all');
  
  const filteredCards = cardFilter === 'all' 
    ? cards 
    : cards.filter(card => {
        const normalizedCardName = card.card_name.toLowerCase().replace(/\s+/g, '-');
        return normalizedCardName.includes(cardFilter) || cardFilter.includes(normalizedCardName);
      });

  return (
    <Tabs defaultValue="all">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="all" onClick={() => setCardFilter('all')}>All</TabsTrigger>
        <TabsTrigger value="space-marine" onClick={() => setCardFilter('space-marine')}>Space Marines</TabsTrigger>
        <TabsTrigger value="galactic-ranger" onClick={() => setCardFilter('galactic-ranger')}>Galactic Rangers</TabsTrigger>
        <TabsTrigger value="void-sorcerer" onClick={() => setCardFilter('void-sorcerer')}>Void Sorcerers</TabsTrigger>
      </TabsList>
      
      <TabsContent value={cardFilter} className="mt-2">
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
            {filteredCards.map(card => {
              const isSelected = !!selectedCards.find(c => c.id === card.id);
              return (
                <div key={card.id} className={`p-2 rounded-lg transition-all ${isSelected ? 'ring-2 ring-yellow-400 bg-gray-700' : ''}`}>
                  <CardDisplay card={card} isRevealed={true} />
                  <Button 
                    className="w-full mt-2"
                    onClick={() => onCardSelect(card)}
                    disabled={!isSelected && selectedCards.length >= BATTLE_DECK_SIZE}
                  >
                    {isSelected ? 'Deselect' : 'Select'}
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
