'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { BattleInstance, BattleSelection } from '@/types/battle';
import { User } from '@supabase/supabase-js';
import { CardSelectionGrid } from '../CardSelectionGrid';

interface CardSelectionPhaseProps {
  battle: BattleInstance;
  selection: BattleSelection | null;
  user: User;
  onCardSelection: (cardId: string) => void;
  checkingSelection?: boolean;
  playerHasSelected?: boolean;
  opponentHasSelected?: boolean;
  lastUpdateTime?: string;
}

export const CardSelectionPhase: React.FC<CardSelectionPhaseProps> = ({
  battle,
  selection,
  user,
  onCardSelection,
  checkingSelection = false,
  playerHasSelected = false,
  opponentHasSelected = false,
  lastUpdateTime = '',
}) => {
  // Determine if current user has already selected a card
  const isChallenger = user.id === battle.challenger_id;
  const hasUserSelected = selection ? 
    (isChallenger ? !!selection.player1_card_id : !!selection.player2_card_id) : false;

  // Show loading state while checking selection
  if (checkingSelection) {
    return (
      <div className="text-center p-8">
        <Loader2 className="mx-auto h-12 w-12 animate-spin" />
        <p className="mt-4 text-gray-400">Checking game state...</p>
      </div>
    );
  }

  // Show card selection UI if user hasn't selected yet
  if (!playerHasSelected && !hasUserSelected) {
    return (
      <div className="space-y-4">
        <div className="text-center p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
          <h2 className="text-xl font-bold text-blue-400">Choose Your Card</h2>
          <p className="text-gray-400">Select a card to battle with</p>
          {opponentHasSelected && (
            <p className="text-green-400 mt-2">
              ✓ Opponent has selected their card {lastUpdateTime && `(${lastUpdateTime})`}
            </p>
          )}
        </div>
        <CardSelectionGrid 
          battleId={battle.id} 
          onSelectionConfirmed={onCardSelection} 
        />
      </div>
    );
  }

  // Show waiting state after user has selected
  return (
    <div className="text-center p-8">
      <Loader2 className="mx-auto h-12 w-12 animate-spin" />
      <h2 className="text-2xl font-bold mt-4">Cards Submitted!</h2>
      <div className="mt-4 space-y-2">
        <p className="text-green-400">✓ You have selected your card</p>
        <p className={`${opponentHasSelected ? 'text-green-400' : 'text-gray-400'}`}>
          {opponentHasSelected ? 
            `✓ Opponent has selected their card ${lastUpdateTime && `(${lastUpdateTime})`}` : 
            '⏳ Waiting for opponent to select their card...'
          }
        </p>
      </div>
      
      {/* Show transition message when both have selected */}
      {opponentHasSelected && (
        <div className="mt-6">
          <p className="text-yellow-400">⏳ Preparing battle...</p>
        </div>
      )}
    </div>
  );
};