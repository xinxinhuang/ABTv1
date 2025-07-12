'use client';

import { Card as GameCard } from '@/types/game';
import { CardDisplay } from '@/components/game/CardDisplay';

interface CardGridProps {
  cards: GameCard[];
  onCardClick?: (card: GameCard) => void;
  selectedCard?: GameCard | null;
  disabledCards?: string[];
}

export function CardGrid({ cards, onCardClick, selectedCard, disabledCards = [] }: CardGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const isSelected = selectedCard?.id === card.id;
        const isDisabled = disabledCards.includes(card.id);
        
        return (
          <div 
            key={card.id}
            className={`
              relative cursor-pointer transition-all transform
              ${isSelected ? 'scale-105 ring-2 ring-blue-500 rounded-lg' : ''}
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={() => {
              if (!isDisabled && onCardClick) {
                onCardClick(card);
              }
            }}
          >
            <CardDisplay card={card} />
            {isSelected && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                ✓
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
