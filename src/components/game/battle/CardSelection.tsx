'use client';

import { useState } from 'react';
import { Card } from '@/types/game';
import { CardDisplay } from '../CardDisplay';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';

interface CardSelectionProps {
  cards: Card[];
  onSelectCard: (card: Card) => void;
  selectedCard: Card | null;
}

export function CardSelection({ 
  cards, 
  onSelectCard,
  selectedCard 
}: CardSelectionProps) {
  const [cardFilter, setCardFilter] = useState<'all' | 'space-marine' | 'galactic-ranger' | 'void-sorcerer'>('all');
  
  const filteredCards = cards.filter(card => {
    if (cardFilter === 'all') return true;
    if (cardFilter === 'space-marine') return card.card_name === 'Space Marine';
    if (cardFilter === 'galactic-ranger') return card.card_name === 'Galactic Ranger';
    if (cardFilter === 'void-sorcerer') return card.card_name === 'Void Sorcerer';
    return true;
  });

  return (
    <div className="space-y-4">
      {selectedCard ? (
        <div className="flex flex-col items-center">
          <CardDisplay card={selectedCard} isRevealed={true} className="w-48 mx-auto" />
          <button 
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            onClick={() => onSelectCard(selectedCard)}
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
              <CardGrid cards={filteredCards} onSelectCard={onSelectCard} />
            </TabsContent>
            <TabsContent value="space-marine" className="mt-2">
              <CardGrid cards={filteredCards} onSelectCard={onSelectCard} />
            </TabsContent>
            <TabsContent value="galactic-ranger" className="mt-2">
              <CardGrid cards={filteredCards} onSelectCard={onSelectCard} />
            </TabsContent>
            <TabsContent value="void-sorcerer" className="mt-2">
              <CardGrid cards={filteredCards} onSelectCard={onSelectCard} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function CardGrid({ cards, onSelectCard }: { cards: Card[], onSelectCard: (card: Card) => void }) {
  if (cards.length === 0) {
    return <div className="text-center py-6 text-gray-500">No cards found</div>;
  }
  
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-1">
        {cards.map(card => (
          <div
            key={card.id}
            className="cursor-pointer transform hover:scale-105 transition-transform"
            onClick={() => onSelectCard(card)}
          >
            <CardDisplay card={card} isRevealed={true} />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
