/**
 * CardSelectionPhase Component V2
 * Rebuilt for humanoid-only battle system
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Clock, User, Users, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';

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
  onRefresh?: () => void;
}

export const CardSelectionPhase: React.FC<CardSelectionPhaseProps> = ({
  battle,
  user,
  playerHasSelected = false,
  opponentHasSelected = false,
  lastUpdateTime = '',
  onCardSelected,
  onRefresh
}) => {
  // Persist selected card in sessionStorage to survive refreshes
  const [selectedCardId, setSelectedCardId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(`selected-card-${battle.id}`) || null;
    }
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hooks
  const { humanoidCards, loading: cardsLoading, error: cardsError, refetch } = useHumanoidCards();
  const { selectCard, isProcessing, actionError, clearError } = useBattleActions(battle.id);

  // Determine opponent info
  const isChallenger = user.id === battle.challenger_id;
  const opponentId = isChallenger ? battle.opponent_id : battle.challenger_id;

  // Clear persisted selection if player has already selected
  React.useEffect(() => {
    if (playerHasSelected && typeof window !== 'undefined') {
      sessionStorage.removeItem(`selected-card-${battle.id}`);
      setSelectedCardId(null);
    }
  }, [playerHasSelected, battle.id]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`selected-card-${battle.id}`);
      }
    };
  }, [battle.id]);

  // Handle card selection
  const handleCardSelect = (cardId: string) => {
    if (playerHasSelected || isSubmitting) return;
    
    const newSelection = selectedCardId === cardId ? null : cardId;
    setSelectedCardId(newSelection);
    
    // Persist selection in sessionStorage
    if (typeof window !== 'undefined') {
      if (newSelection) {
        sessionStorage.setItem(`selected-card-${battle.id}`, newSelection);
      } else {
        sessionStorage.removeItem(`selected-card-${battle.id}`);
      }
    }
    
    clearError();
  };

  // Handle selection confirmation
  const handleConfirmSelection = async () => {
    if (!selectedCardId || isSubmitting || playerHasSelected) return;

    // Double-check that player hasn't already selected
    if (playerHasSelected) {
      console.warn('Player has already selected a card, preventing duplicate selection');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await selectCard(selectedCardId);
      
      // Clear the persisted selection since it was successfully submitted
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`selected-card-${battle.id}`);
      }
      
      // Notify parent component
      if (onCardSelected) {
        onCardSelected(selectedCardId);
      }
      
      console.log('Card selection confirmed successfully');
      
    } catch (error) {
      console.error('Failed to confirm card selection:', error);
      // Error is handled by the useBattleActions hook
      
      // If it's a "card already selected" error, we should refresh the battle state
      if (error instanceof Error && error.message.includes('already selected')) {
        console.log('Card already selected error detected, this might be a sync issue');
        // Trigger a refresh to get the latest battle state
        if (onRefresh) {
          setTimeout(() => {
            onRefresh();
          }, 1000);
        }
      }
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
    // If both players have selected, show processing state
    if (opponentHasSelected) {
      return (
        <div className="text-center p-12 space-y-6">
          <div className="flex justify-center">
            <Loader2 className="h-20 w-20 animate-spin text-blue-400" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-blue-400">Processing Battle...</h2>
            <p className="text-xl text-gray-300">Both players have submitted their cards!</p>
            <p className="text-lg text-gray-400">Calculating battle results...</p>
            
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500 rounded-lg space-y-3">
              <p className="text-blue-400 font-semibold">
                ⚔️ Battle in progress! Results will appear shortly...
              </p>
              <p className="text-sm text-blue-300">
                Results should appear automatically. If they don't, you can check manually.
              </p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  🔄 Check Results Now
                </button>
              )}
            </div>

            {lastUpdateTime && (
              <p className="text-sm text-gray-500">
                Last update: {lastUpdateTime}
              </p>
            )}
          </div>
        </div>
      );
    }

    // Show waiting for opponent state
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
          
          {/* Battle status with real-time opponent monitoring */}
          <OpponentStatusMonitor 
            battle={battle}
            user={user}
            opponentHasSelected={opponentHasSelected}
            onForfeit={onRefresh} // Use refresh as forfeit for now, can be enhanced later
          />

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

// Component to monitor opponent's real-time status
interface OpponentStatusMonitorProps {
  battle: BattleInstance;
  user: SupabaseUser;
  opponentHasSelected: boolean;
  onForfeit?: () => void;
}

const OpponentStatusMonitor: React.FC<OpponentStatusMonitorProps> = ({
  battle,
  user,
  opponentHasSelected,
  onForfeit
}) => {
  const [opponentOnline, setOpponentOnline] = useState<boolean | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [timeWaiting, setTimeWaiting] = useState(0);
  const supabase = createClient();

  // Determine opponent ID
  const opponentId = user.id === battle.challenger_id ? battle.opponent_id : battle.challenger_id;

  // Monitor opponent's activity and online status
  useEffect(() => {
    if (!opponentId) return;

    const checkOpponentActivity = async () => {
      try {
        // Method 1: Check if opponent has submitted a card (most reliable)
        const { data: opponentCard } = await supabase
          .from('battle_cards')
          .select('created_at')
          .eq('battle_id', battle.id)
          .eq('player_id', opponentId)
          .single();

        if (opponentCard) {
          // Opponent has submitted their card
          setOpponentOnline(true);
          setLastSeen(opponentCard.created_at);
          return;
        }

        // Method 2: Try to check online_players table (might fail due to RLS)
        try {
          const { data: onlinePlayers, error } = await supabase
            .from('online_players')
            .select('id, last_seen, status');

          if (!error && onlinePlayers) {
            const opponentStatus = onlinePlayers.find(player => player.id === opponentId);
            
            if (opponentStatus) {
              const lastSeenTime = new Date(opponentStatus.last_seen);
              const now = new Date();
              const timeDiff = now.getTime() - lastSeenTime.getTime();
              
              // Consider online if seen within last 3 minutes
              const isOnline = timeDiff < 180000;
              setOpponentOnline(isOnline);
              setLastSeen(opponentStatus.last_seen);
              console.log('✅ Opponent online status:', { isOnline, timeDiff: Math.floor(timeDiff/1000) + 's' });
              return;
            }
          }
        } catch (onlineError) {
          console.warn('Cannot check online_players (RLS restriction):', onlineError.message);
        }

        // Method 3: Fallback - assume unknown status
        console.log('⚠️ Cannot determine opponent status, showing as unknown');
        setOpponentOnline(null);
        
      } catch (error) {
        console.warn('Error checking opponent activity:', error);
        setOpponentOnline(null);
      }
    };

    // Check immediately
    checkOpponentActivity();

    // Check every 15 seconds (less frequent to reduce errors)
    const interval = setInterval(checkOpponentActivity, 15000);

    return () => clearInterval(interval);
  }, [opponentId, battle.id, supabase]);

  // Track waiting time
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeWaiting(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format waiting time
  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get opponent status display
  const getOpponentStatus = () => {
    if (opponentHasSelected) {
      return {
        text: 'Ready',
        color: 'text-green-400',
        icon: <User className="h-5 w-5" />,
        description: 'Opponent has selected their card'
      };
    }

    if (opponentOnline === false) {
      return {
        text: 'May be offline',
        color: 'text-red-400',
        icon: <WifiOff className="h-5 w-5" />,
        description: 'Opponent may have left the battle'
      };
    }

    if (opponentOnline === true) {
      return {
        text: 'Selecting...',
        color: 'text-yellow-400',
        icon: <Wifi className="h-5 w-5" />,
        description: 'Opponent is choosing their card'
      };
    }

    return {
      text: 'Status unknown',
      color: 'text-gray-400',
      icon: <Users className="h-5 w-5" />,
      description: 'Cannot determine opponent status'
    };
  };

  const opponentStatus = getOpponentStatus();

  return (
    <div className="space-y-4">
      {/* Battle status */}
      <div className="flex justify-center space-x-8 mt-8">
        <div className="flex items-center space-x-2 text-green-400">
          <User className="h-5 w-5" />
          <span className="font-semibold">You: Ready</span>
        </div>
        <div className={`flex items-center space-x-2 ${opponentStatus.color}`}>
          {opponentStatus.icon}
          <span className="font-semibold">Opponent: {opponentStatus.text}</span>
        </div>
      </div>

      {/* Waiting time and status details */}
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-400">
          Waiting time: {formatWaitTime(timeWaiting)}
        </p>
        
        <p className="text-xs text-gray-500">
          {opponentStatus.description}
        </p>
        
        {opponentOnline === false && timeWaiting > 60 && (
          <div className="p-3 bg-red-900/20 border border-red-500 rounded-lg">
            <div className="flex items-center justify-center space-x-2 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">Opponent may have left</span>
            </div>
            <p className="text-xs text-red-300 mt-1">
              No recent activity detected from your opponent
            </p>
          </div>
        )}

        {opponentOnline === null && timeWaiting > 30 && (
          <div className="p-3 bg-gray-900/20 border border-gray-500 rounded-lg">
            <div className="flex items-center justify-center space-x-2 text-gray-400">
              <Users className="h-4 w-4" />
              <span className="text-sm font-semibold">Cannot monitor opponent status</span>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              System limitations prevent real-time opponent monitoring
            </p>
          </div>
        )}

        {timeWaiting > 90 && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-500 rounded-lg space-y-3">
            <div className="flex items-center justify-center space-x-2 text-yellow-400">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {timeWaiting > 180 ? 'Very long wait time' : 'Long wait time detected'}
              </span>
            </div>
            <p className="text-xs text-yellow-300">
              {opponentOnline === false 
                ? "Your opponent may have left the battle."
                : opponentOnline === null
                ? "Cannot determine if opponent is still active."
                : "Your opponent may be taking their time to choose."
              }
            </p>
            
            {timeWaiting > 120 && (
              <div className="flex justify-center space-x-2">
                <button
                  onClick={onForfeit}
                  disabled={!onForfeit}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                >
                  Return to Lobby
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};