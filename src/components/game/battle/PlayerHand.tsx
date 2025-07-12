'use client';

import React from 'react';

// Define a type for the card object for type safety
interface Card {
  id: string;
  name: string;
  attack: number;
  defense: number;
}

interface CardViewProps {
  card: Card;
  onSelect: (card: Card) => void;
}

const CardView: React.FC<CardViewProps> = ({ card, onSelect }) => (
  <div 
    className="w-28 h-40 border-2 border-gray-600 bg-gray-700 rounded-lg p-2 m-2 cursor-pointer hover:border-yellow-400 transition-all"
    onClick={() => onSelect(card)}
  >
    <h4 className="font-bold text-sm text-white">{card.name}</h4>
    <div className="text-xs text-gray-300 mt-2">
      <p>ATK: {card.attack}</p>
      <p>DEF: {card.defense}</p>
    </div>
  </div>
);


interface PlayerHandProps {
  cards: Card[];
  onSelectCard: (card: Card) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ cards, onSelectCard }) => {
  return (
    <div className="bg-gray-900 p-2 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-2">Your Hand</h3>
      <div className="flex flex-wrap justify-center">
        {cards && cards.length > 0 ? (
          cards.map((card) => (
            <CardView key={card.id} card={card} onSelect={onSelectCard} />
          ))
        ) : (
          <p className="text-gray-400">No cards in hand.</p>
        )}
      </div>
    </div>
  );
};
