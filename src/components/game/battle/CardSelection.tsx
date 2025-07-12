'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '../../../hooks/useUser';
import { Card } from '@/types/game';
import { BattleLobby } from '@/types/battle';
import { CardDisplay } from '../CardDisplay';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Loader2 } from 'lucide-react';

const BATTLE_DECK_SIZE = 5;

interface CardSelectionProps {
  lobby: BattleLobby;
}

export function CardSelection({ lobby }: CardSelectionProps) {
  const { user } = useUser();
  const supabase = createClient();
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      } catch (err: any) {
        setError('Failed to fetch your cards. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCards();
  }, [user, supabase]);

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
      setError(`You must select exactly ${BATTLE_DECK_SIZE} cards.`);
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('select-cards', {
        body: {
          lobby_id: lobby.id,
          selected_cards: selectedCards.map(c => c.id),
        },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      console.log('Card selection submitted successfully.');

    } catch (err: any) {
      setError(err.message);
      console.error(err);
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

  const isPlayer1 = user?.id === lobby.player1_id;
  const playerReady = isPlayer1 ? lobby.battle_state?.player1_ready : lobby.battle_state?.player2_ready;

  if (playerReady) {
    return <div className="text-center p-8">Waiting for the other player to select their cards...</div>;
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
