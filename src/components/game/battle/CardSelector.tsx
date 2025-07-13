'use client';

import { CardDisplay } from '../CardDisplay';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { Card as PlayerCard } from '@/types/game';

// Custom card type for battle UI
export type BattleCard = {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  type: string;
  attributes: Record<string, number>;
};

interface CardSelectorProps {
  cards: BattleCard[];
  onCardSelect: (card: BattleCard) => void;
  onConfirmSelection: (card: BattleCard) => Promise<void>;
  selectedCard: BattleCard | null;
  isSubmitting: boolean;
}

export function CardSelector({ 
  cards, 
  onCardSelect, 
  onConfirmSelection,
  selectedCard, 
  isSubmitting 
}: CardSelectorProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  
  const handleConfirm = async () => {
    if (!selectedCard) return;
    
    try {
      setIsConfirming(true);
      await onConfirmSelection(selectedCard);
    } catch (error) {
      console.error('Error confirming card selection:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg shadow-xl border border-gray-700">
      <h2 className="text-2xl font-bold text-center text-white mb-4">Select Your Champion</h2>
      
      {cards.length === 0 ? (
        <p className="text-center text-gray-400 my-8">You have no cards available for battle.</p>
      ) : (
        <ScrollArea className="h-72 w-full mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
            {cards.map((card) => (
              <div 
                key={card.id} 
                onClick={() => !isSubmitting && !isConfirming && onCardSelect(card)}
                className={`
                  transition-all duration-200
                  ${selectedCard?.id === card.id ? 'scale-105' : ''}
                `}
              >
                <CardDisplay
                  card={{
                    id: card.id,
                    player_id: '', // Not needed for display
                    card_type: card.type as any,
                    card_name: card.name,
                    attributes: card.attributes,
                    rarity: card.rarity as any,
                    obtained_at: new Date().toISOString(), // Not needed for display
                  }}
                  isSelected={selectedCard?.id === card.id}
                  isSelectable={!isSubmitting && !isConfirming}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="text-center">
        <Button
          onClick={handleConfirm}
          disabled={!selectedCard || isSubmitting || isConfirming}
          className="w-full md:w-1/2 lg:w-1/3 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-lg"
        >
          {isConfirming ? 'Confirming...' : isSubmitting ? 'Waiting for opponent...' : 'Confirm Selection'}
        </Button>
      </div>
    </div>
  );
}
