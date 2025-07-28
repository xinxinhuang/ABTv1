/**
 * CardSelectionPhase Component V2
 * Rebuilt for humanoid-only battle system
 */

'use client';

import React, { useState } from 'react';
import { Loader2, Clock, User, Users } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';

import { BattleInstance } from '@/types/battle-consolidated';
import { useBattleActions } from '@/hooks/battle-v2/useBattleActions';
import { useHumanoidCards } from '@/hooks/battle-v2/useHumanoidCards';

import { HumanoidCardGrid } from '../HumanoidCardGrid';

interface CardSelectionPhaseProps {
  battle: BattleInstance;
  user: SupabaseUser;
  playerHasSelected?: boolean;
  opponentHasSelected?: boolean;
  lastUpdateTime?: string;
  onCardSelected?: (cardId: string) => void;
}

export const CardSelectionPhase: React.FC<CardSelectionPhaseProps> = ({
  battle,
  user,
  playerHasSelected = false,
  opponentHasSelected = false,
  lastUpdateTime = '',
  onCardSelected
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hooks
  const { humanoidCards, loading: cardsLoading, error: cardsError, refetch } = useHumanoidCards();
  const { selectCard, isProcessing, actionError, clearError } = useBattleActions(battle.id);

  // Determine opponent info
  const isChallenger = user.id === battle.challenger_id;
  const opponentId = isChallenger ? battle.opponent_id : battle.challenger_id;

  // Handle card selection
  const handleCardSelect = (cardId: string) => {
    if (playerHasSelected || isSubmitting) return;
    
    setSelectedCardId(prev => prev === cardId ? null : cardId);
    clearError();
  };

  // Handle selection confirmation
  const handleConfirmSelection = async () => {
    if (!selectedCardId || isSubmitting || playerHasSelected) return;

    setIsSubmitting(true);
    
    try {
      await selectCard(selectedCardId);
      
      // Notify parent component
      if (onCardSelected) {
        onCardSelected(selectedCardId);
      }
      
      console.log('Card selection confirmed successfully');
      
    } catch (error) {
      console.error('Failed to confirm card selection:', error);
      // Error is handled by the useBattleActions hook
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while fetching cards
  if (cardsLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-16 w-16 animate-spin text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Loading Battle Arena</h2>
        <p className="text-gray-400">Preparing your humanoid cards...</p>
      </div>
    );
  }

  // Show error state if cards failed to load
  if (cardsError) {
    return (
      <div className="p-8 bg-red-900/20 border border-red-500 rounded-lg">
        <h2 className="text-xl font-bold text-red-400 mb-4">Failed to Load Cards</h2>
        <p className="text-red-300 mb-4">{cardsError}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show waiting state if player has already selected
  if (playerHasSelected) {
    return (
      <div className="text-center p-12 space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <Loader2 className="h-20 w-20 animate-spin text-green-400" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-sm">✓</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-green-400">Card Selected!</h2>
          <p className="text-xl text-gray-300">Waiting for your opponent...</p>
          
          {/* Battle status */}
          <div className="flex justify-center space-x-8 mt-8">
            <div className="flex items-center space-x-2 text-green-400">
              <User className="h-5 w-5" />
              <span className="font-semibold">You: Ready</span>
            </div>
            <div className={`flex items-center space-x-2 ${
              opponentHasSelected ? 'text-green-400' : 'text-gray-400'
            }`}>
              <Users className="h-5 w-5" />
              <span className="font-semibold">
                Opponent: {opponentHasSelected ? 'Ready' : 'Selecting...'}
              </span>
            </div>
          </div>

          {opponentHasSelected && (
            <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg">
              <p className="text-yellow-400 font-semibold">
                🎯 Both players ready! Battle starting soon...
              </p>
            </div>
          )}

          {lastUpdateTime && (
            <p className="text-sm text-gray-500">
              Last update: {lastUpdateTime}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show card selection interface
  return (
    <div className="space-y-6">
      {/* Battle Header */}
      <div className="text-center p-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/50 rounded-lg">
        <h1 className="text-3xl font-bold text-white mb-2">Battle Arena</h1>
        <p className="text-lg text-gray-300 mb-4">Choose your strongest humanoid card</p>
        
        {/* Battle Status */}
        <div className="flex justify-center items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-gray-400">Card Selection Phase</span>
          </div>
          
          {opponentHasSelected && (
            <div className="flex items-center space-x-2 text-green-400">
              <Users className="h-4 w-4" />
              <span>Opponent Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {actionError && (
        <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Selection Failed</h3>
          <p className="text-red-300">{actionError}</p>
          <button
            onClick={clearError}
            className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Humanoid Cards Grid */}
      <HumanoidCardGrid
        cards={humanoidCards}
        selectedCardId={selectedCardId}
        onCardSelect={handleCardSelect}
        onConfirmSelection={handleConfirmSelection}
        disabled={isSubmitting || isProcessing}
        loading={isSubmitting || isProcessing}
        error={actionError}
      />

      {/* Selection Instructions */}
      {!selectedCardId && humanoidCards.length > 0 && (
        <div className="text-center p-4 bg-gray-800/50 border border-gray-600 rounded-lg">
          <p className="text-gray-300">
            💡 <strong>Tip:</strong> Choose a card with high total stats for the best chance of winning!
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Cards are compared by Strength, Dexterity, and Intelligence attributes.
          </p>
        </div>
      )}

      {/* Processing State Overlay */}
      {(isSubmitting || isProcessing) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-600 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Submitting Selection</h3>
            <p className="text-gray-400">Please wait while we process your card selection...</p>
          </div>
        </div>
      )}
    </div>
  );
};