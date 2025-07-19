'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { BattleInstance } from '@/types/battle';
import { Card } from '@/types/game';
import { User } from '@supabase/supabase-js';

interface CardsRevealedPhaseProps {
  battle: BattleInstance;
  player1Card: Card | null;
  player2Card: Card | null;
  user: User;
  countdownSeconds: number;
}

export const CardsRevealedPhase: React.FC<CardsRevealedPhaseProps> = ({
  battle,
  player1Card,
  player2Card,
  user,
  countdownSeconds,
}) => {
  // Determine which card belongs to current user
  const isChallenger = user.id === battle.challenger_id;
  const currentUserCard = isChallenger ? player1Card : player2Card;
  const opponentCard = isChallenger ? player2Card : player1Card;

  const renderCard = (card: Card | null, title: string, borderColor: string, textColor: string) => {
    if (!card) {
      return (
        <div className={`bg-gray-800 p-6 rounded-lg border-2 ${borderColor} animate-pulse`}>
          <Loader2 className={`mx-auto h-8 w-8 animate-spin ${textColor}`} />
          <p className="text-gray-400 mt-2">Loading card...</p>
        </div>
      );
    }

    return (
      <div className={`bg-gray-800 p-6 rounded-lg border-2 ${borderColor} transform transition-all duration-500 hover:scale-105 animate-fadeIn`}>
        <h4 className={`text-xl font-bold ${textColor} mb-2`}>{card.card_name}</h4>
        <p className="text-sm text-gray-400 mb-2">{card.card_type}</p>
        <p className="text-sm text-gray-400 mb-4">{card.rarity}</p>
        {card.card_name.includes('(') && (
          <p className="text-xs text-yellow-400 mb-2">ⓘ Card transferred - showing battle info</p>
        )}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>STR:</span>
            <span className="font-bold">{card.attributes?.str || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>DEX:</span>
            <span className="font-bold">{card.attributes?.dex || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>INT:</span>
            <span className="font-bold">{card.attributes?.int || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="text-center p-8 space-y-6">
      {/* Header with countdown */}
      <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6 animate-pulse">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2">⚔️ Cards Revealed!</h2>
        <p className="text-gray-300">Both players have chosen their cards</p>
        <div className="mt-4 text-yellow-400">
          {countdownSeconds > 0 ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold animate-bounce">{countdownSeconds}</div>
              <p className="text-sm">
                Battle resolving in {countdownSeconds} second{countdownSeconds !== 1 ? 's' : ''}...
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              <p className="text-sm">Resolving battle now...</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Cards Display */}
      <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Current User's Card */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4 text-blue-400">Your Card</h3>
          {renderCard(currentUserCard, "Your Card", "border-blue-500", "text-blue-400")}
        </div>
        
        {/* Opponent's Card */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4 text-red-400">Opponent's Card</h3>
          {renderCard(opponentCard, "Opponent's Card", "border-red-500", "text-red-400")}
        </div>
      </div>
      
      {/* Status Message */}
      <div className="text-center">
        <p className="text-gray-400 text-sm">Determining winner...</p>
      </div>
    </div>
  );
};