'use client';

import React from 'react';
import { BattleInstance } from '@/types/battle';
import { Card } from '@/types/game';
import { User } from '@supabase/supabase-js';

interface BattleCompletedPhaseProps {
  battle: BattleInstance;
  player1Card: Card | null;
  player2Card: Card | null;
  user: User;
  onReturnToGame: () => void;
  onFindNewBattle: () => void;
}

export const BattleCompletedPhase: React.FC<BattleCompletedPhaseProps> = ({
  battle,
  player1Card,
  player2Card,
  user,
  onReturnToGame,
  onFindNewBattle,
}) => {
  const isWinner = battle.winner_id === user.id;
  const isDraw = !battle.winner_id;
  
  // Determine which card belongs to current user
  const isChallenger = user.id === battle.challenger_id;
  const currentUserCard = isChallenger ? player1Card : player2Card;
  const opponentCard = isChallenger ? player2Card : player1Card;

  const renderCard = (card: Card | null, title: string, textColor: string) => {
    if (!card) {
      return (
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-gray-400">Card data unavailable</p>
        </div>
      );
    }

    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <h4 className={`font-bold ${textColor}`}>{card.card_name}</h4>
        <p className="text-sm text-gray-400">{card.card_type}</p>
        <p className="text-sm text-gray-400">{card.rarity}</p>
        {card.card_name.includes('(') && (
          <p className="text-xs text-yellow-400 mt-1">ⓘ Card transferred - showing battle info</p>
        )}
        <div className="mt-2 text-sm">
          <div>STR: {card.attributes?.str || 0}</div>
          <div>DEX: {card.attributes?.dex || 0}</div>
          <div>INT: {card.attributes?.int || 0}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="text-center p-8 space-y-6">
      {/* Result Header */}
      <div className="bg-gray-900 p-6 rounded-lg">
        <h1 className={`text-4xl font-bold mb-4 ${
          isDraw ? 'text-yellow-400' : 
          isWinner ? 'text-green-400' : 'text-red-400'
        }`}>
          {isDraw ? 'It\'s a Draw!' : isWinner ? 'You Won!' : 'You Lost!'}
        </h1>
        
        {battle.winner_id && (
          <p className="text-gray-300 mb-4">
            Winner: {battle.winner_id === battle.challenger_id ? 'Challenger' : 'Opponent'}
          </p>
        )}
        
        {/* Battle Explanation */}
        {battle.explanation && (
          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Battle Result</h3>
            <p className="text-gray-300">{battle.explanation}</p>
          </div>
        )}
        
        {/* Cards Display */}
        <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto mt-6">
          {/* Current User's Card */}
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Your Card</h3>
            {renderCard(currentUserCard, "Your Card", "text-blue-400")}
          </div>
          
          {/* Opponent's Card */}
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Opponent's Card</h3>
            {renderCard(opponentCard, "Opponent's Card", "text-red-400")}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-6 space-y-4">
          <button
            onClick={onReturnToGame}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Return to Game
          </button>
          
          <button
            onClick={onFindNewBattle}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold ml-4"
          >
            Find New Battle
          </button>
        </div>
        
        {/* Battle Info */}
        <div className="mt-6 text-sm text-gray-400 space-y-1">
          <p>Battle ID: {battle.id}</p>
          {battle.completed_at && (
            <p>Completed: {new Date(battle.completed_at).toLocaleString()}</p>
          )}
          {battle.transfer_completed && (
            <p className="text-green-400">✓ Card transfers completed</p>
          )}
        </div>
      </div>
    </div>
  );
};