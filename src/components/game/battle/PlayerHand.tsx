'use client';

import React, { useState, useEffect } from 'react';

import { createClient } from '@/lib/supabase/client';

// Define types for the database query results
type CardAttributes = {
  str?: number;
  dex?: number;
  int?: number;
};

// Define the type for our card details from the database
interface DbQueryResult {
  id: string;
  cards: {
    name: string;
    attributes: CardAttributes;
  } | null;
}

interface CardViewProps {
  cardId: string;
  cardData?: {
    name: string;
    attack: number;
    defense: number;
  };
  onSelect: (cardId: string) => void;
}

const CardView: React.FC<CardViewProps> = ({ cardId, cardData, onSelect }) => (
  <div 
    className="w-28 h-40 border-2 border-gray-600 bg-gray-700 rounded-lg p-2 m-2 cursor-pointer hover:border-yellow-400 transition-all"
    onClick={() => onSelect(cardId)}
  >
    {cardData ? (
      <>
        <h4 className="font-bold text-sm text-white">{cardData.name}</h4>
        <div className="text-xs text-gray-300 mt-2">
          <p>ATK: {cardData.attack}</p>
          <p>DEF: {cardData.defense}</p>
        </div>
      </>
    ) : (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-gray-400">Card ID: {cardId.slice(0, 8)}...</p>
      </div>
    )}
  </div>
);


interface PlayerHandProps {
  cards: string[];
  onSelectCard: (cardId: string) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ cards, onSelectCard }) => {
  const supabase = createClient();
  const [cardDetails, setCardDetails] = useState<Record<string, {name: string; attack: number; defense: number}>>({});
  
  useEffect(() => {
    const fetchCardDetails = async () => {
      if (!cards || cards.length === 0) return;
      
      try {
        // Explicitly type the query response
        const { data, error } = await supabase
          .from('player_cards')
          .select('id, cards(name, attributes)')
          .in('id', cards);
          
        if (error) throw error;
        
        // Create strongly-typed map for card details
        const detailsMap: Record<string, {name: string; attack: number; defense: number}> = {};
        
        if (data) {
          // Safely process each card
          data.forEach((item: any) => {
            detailsMap[item.id] = {
              name: item.cards?.name || 'Unknown Card',
              attack: item.cards?.attributes?.str || 0,
              defense: item.cards?.attributes?.dex || 0
            };
          });
        }
        
        setCardDetails(detailsMap);
      } catch (err) {
        console.error('Error fetching card details:', err);
      }
    };
    
    fetchCardDetails();
  }, [cards, supabase]);
  
  return (
    <div className="bg-gray-900 p-2 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-2">Your Selected Cards</h3>
      <div className="flex flex-wrap justify-center">
        {cards && cards.length > 0 ? (
          cards.map((cardId) => (
            <CardView 
              key={cardId} 
              cardId={cardId} 
              cardData={cardDetails[cardId]} 
              onSelect={onSelectCard} 
            />
          ))
        ) : (
          <p className="text-gray-400">No cards selected.</p>
        )}
      </div>
    </div>
  );
};
