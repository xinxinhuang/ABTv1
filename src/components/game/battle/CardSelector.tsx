'use client';

import { Card } from '@/types/game';
import { CardDisplay } from '../CardDisplay';
import { ScrollArea } from '@/components/ui/ScrollArea';

interface CardSelectorProps {
  cards: Card[];
  onCardSelect: (card: Card) => void;
  selectedCard: Card | null;
  isSubmitting: boolean;
}

export function CardSelector({ 
  cards, 
  onCardSelect, 
  selectedCard, 
  isSubmitting 
}: CardSelectorProps) {
  return (
    <ScrollArea className="h-72 w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
        {cards.map((card) => (
          <div key={card.id} onClick={() => !isSubmitting && onCardSelect(card)}>
            <CardDisplay
              card={card}
              isSelected={selectedCard?.id === card.id}
              isSelectable={!isSubmitting}
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
