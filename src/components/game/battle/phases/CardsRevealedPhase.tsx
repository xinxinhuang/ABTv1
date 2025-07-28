'use client';

import React, { useState } from 'react';
import { Loader2, HelpCircle } from 'lucide-react';
import { User } from '@supabase/supabase-js';

import { Card } from '@/types/game';

import { CardTriangleDialog } from '../CardTriangleDialog';

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
  const [showTriangleDialog, setShowTriangleDialog] = useState(false);
  
  // Determine which card belongs to current user
  const isChallenger = user.id === battle.challenger_id;
  const currentUserCard = isChallenger ? player1Card : player2Card;
  const opponentCard = isChallenger ? player2Card : player1Card;

  const getCardTypeIcon = (cardType: string) => {
    const type = cardType.toLowerCase();
    if (type.includes('space marine')) return '🛡️';
    if (type.includes('galactic ranger')) return '🏹';
    if (type.includes('void sorcerer')) return '🧙‍♂️';
    return '⚔️';
  };

  const getCardTypeColor = (cardType: string) => {
    const type = cardType.toLowerCase();
    if (type.includes('space marine')) return 'text-red-400';
    if (type.includes('galactic ranger')) return 'text-green-400';
    if (type.includes('void sorcerer')) return 'text-purple-400';
    return 'text-gray-400';
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'gold': return 'text-yellow-400';
      case 'silver': return 'text-gray-300';
      case 'bronze': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const renderCard = (card: Card | null, title: string, borderColor: string, textColor: string) => {
    if (!card) {
      return (
        <div className={`bg-gray-800 p-6 rounded-lg border-2 ${borderColor} animate-pulse min-h-[280px] flex flex-col items-center justify-center`}>
          <Loader2 className={`h-8 w-8 animate-spin ${textColor} mb-2`} />
          <p className="text-gray-400 text-sm">Loading card...</p>
        </div>
      );
    }

    const cardTypeIcon = getCardTypeIcon(card.card_type);
    const cardTypeColor = getCardTypeColor(card.card_type);
    const rarityColor = getRarityColor(card.rarity);

    return (
      <div className={`bg-gray-800 p-6 rounded-lg border-2 ${borderColor} transform transition-all duration-500 hover:scale-105 animate-fadeIn min-h-[280px]`}>
        {/* Card Header */}
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{cardTypeIcon}</div>
          <h4 className={`text-xl font-bold ${textColor} mb-1`}>{card.card_name}</h4>
          <p className={`text-sm font-semibold ${cardTypeColor} mb-1`}>{card.card_type}</p>
          <p className={`text-xs font-medium ${rarityColor} uppercase tracking-wide`}>{card.rarity}</p>
        </div>

        {/* Transfer Notice */}
        {card.card_name.includes('(') && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-2 mb-4">
            <p className="text-xs text-yellow-400 text-center">ⓘ Card transferred - showing battle info</p>
          </div>
        )}

        {/* Attributes */}
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
            <span className="text-sm font-medium">STR:</span>
            <span className="font-bold text-red-400">{card.attributes?.str || 0}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
            <span className="text-sm font-medium">DEX:</span>
            <span className="font-bold text-green-400">{card.attributes?.dex || 0}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
            <span className="text-sm font-medium">INT:</span>
            <span className="font-bold text-purple-400">{card.attributes?.int || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="text-center p-8 space-y-6">
      {/* Header with countdown */}
      <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6 animate-pulse">
        <div className="flex items-center justify-center gap-4 mb-2">
          <h2 className="text-3xl font-bold text-yellow-400">⚔️ Cards Revealed!</h2>
          <button
            onClick={() => setShowTriangleDialog(true)}
            className="text-gray-400 hover:text-yellow-400 transition-colors"
            title="View card type advantages"
          >
            <HelpCircle className="h-6 w-6" />
          </button>
        </div>
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

      {/* Card Triangle Dialog */}
      <CardTriangleDialog 
        isOpen={showTriangleDialog}
        onClose={() => setShowTriangleDialog(false)}
      />
    </div>
  );
};