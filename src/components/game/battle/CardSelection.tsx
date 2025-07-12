'use client';

import { useState } from 'react';
import { Card } from '@/types/game';
import { CardDisplay } from '../CardDisplay';
import { Button } from '@/components/ui/Button';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Loader2 } from 'lucide-react';

interface CardSelectionProps {
  cards: Card[];
  onCardSelect: (card: Card) => void;
  selectedCard: Card | null;
  isSubmitting: boolean;
}

export function CardSelection({ 
  cards, 
  onCardSelect,
  selectedCard,
  isSubmitting
}: CardSelectionProps) {
  const [cardFilter, setCardFilter] = useState<'all' | 'space-marine' | 'galactic-ranger' | 'void-sorcerer'>('all');
  
  // Improved filtering logic that's more flexible with card names
  const filteredCards = cardFilter === 'all' 
    ? cards 
    : cards.filter(card => {
        const normalizedCardName = card.card_name.toLowerCase().replace(/\s+/g, '-');
        return normalizedCardName.includes(cardFilter) || cardFilter.includes(normalizedCardName);
      });

  return (
    <div className="space-y-4">
      {selectedCard ? (
        <div className="flex flex-col items-center">
          <CardDisplay card={selectedCard} isRevealed={true} className="w-48 mx-auto" />
          <button 
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            onClick={() => onCardSelect(selectedCard)}
          >
            Change Selection
          </button>
        </div>
      ) : (
        <>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" onClick={() => setCardFilter('all')}>All</TabsTrigger>
              <TabsTrigger value="space-marine" onClick={() => setCardFilter('space-marine')}>Space Marines</TabsTrigger>
              <TabsTrigger value="galactic-ranger" onClick={() => setCardFilter('galactic-ranger')}>Galactic Rangers</TabsTrigger>
              <TabsTrigger value="void-sorcerer" onClick={() => setCardFilter('void-sorcerer')}>Void Sorcerers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-2">
              <CardGrid cards={filteredCards} onCardSelect={onCardSelect} isSubmitting={isSubmitting} />
            </TabsContent>
            <TabsContent value="space-marine" className="mt-2">
              <CardGrid cards={filteredCards} onCardSelect={onCardSelect} isSubmitting={isSubmitting} />
            </TabsContent>
            <TabsContent value="galactic-ranger" className="mt-2">
              <CardGrid cards={filteredCards} onCardSelect={onCardSelect} isSubmitting={isSubmitting} />
            </TabsContent>
            <TabsContent value="void-sorcerer" className="mt-2">
              <CardGrid cards={filteredCards} onCardSelect={onCardSelect} isSubmitting={isSubmitting} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function CardGrid({ cards, onCardSelect, isSubmitting }: { cards: Card[], onCardSelect: (card: Card) => void, isSubmitting: boolean }) {
  console.log('CardGrid received cards:', cards);
  
  if (cards.length === 0) {
    return <div className="text-center py-6 text-gray-500">No cards found. Please open some packs to get cards for battle.</div>;
  }
  
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-1">
        {cards.map(card => (
          <div key={card.id}>
            <CardDisplay card={card} isRevealed={true} />
            <Button 
              className="w-full mt-2"
              onClick={() => onCardSelect(card)}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Select
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
