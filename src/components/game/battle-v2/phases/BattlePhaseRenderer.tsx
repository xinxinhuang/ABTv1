/**
 * BattlePhaseRenderer Component V2
 * Orchestrates all battle phases and handles transitions
 */

'use client';

import React, { ErrorBoundary } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { BattleInstance, HumanoidCard, BattleStatus } from '@/types/battle-v2';
import { User } from '@supabase/supabase-js';
import { CardSelectionPhase } from './CardSelectionPhase';
import { CardsRevealedPhase } from './CardsRevealedPhase';
import { BattleInProgressPhase } from './BattleInProgressPhase';
import { BattleCompletedPhase } from './BattleCompletedPhase';
import { getBattlePhaseDisplayName } from '@/lib/battle-v2/utils';

interface BattlePhaseRendererProps {
  battle: BattleInstance | null;
  user: User | null;
  playerCard: HumanoidCard | null;
  opponentCard: HumanoidCard | null;
  playerHasSelected?: boolean;
  opponentHasSelected?: boolean;
  lastUpdateTime?: string;
  onCardSelected?: (cardId: string) => void;
  onResolutionTriggered?: () => void;
  onBattleComplete?: () => void;
  onReturnToLobby?: () => void;
  onFindNewBattle?: () => void;
  onRefresh?: () => void;
}

/**
 * Error Boundary Component for Phase Components
 */
class PhaseErrorBoundary extends React.Component<
  { children: React.ReactNode; phaseName: string; onRetry?: () => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.phaseName} phase:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-900/20 border border-red-500 rounded-lg text-center">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">
            {this.props.phaseName} Error
          </h2>
          <p className="text-red-300 mb-4">
            Something went wrong in the {this.props.phaseName.toLowerCase()} phase.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          {this.props.onRetry && (
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                this.props.onRetry?.();
              }}
              className="flex items-center space-x-2 mx-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export const BattlePhaseRenderer: React.FC<BattlePhaseRendererProps> = ({
  battle,
  user,
  playerCard,
  opponentCard,
  playerHasSelected = false,
  opponentHasSelected = false,
  lastUpdateTime = '',
  onCardSelected,
  onResolutionTriggered,
  onBattleComplete,
  onReturnToLobby,
  onFindNewBattle,
  onRefresh
}) => {
  // Validation checks
  if (!battle) {
    return (
      <div className="p-8 bg-red-900/20 border border-red-500 rounded-lg text-center">
        <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-400 mb-2">Battle Not Found</h2>
        <p className="text-red-300 mb-4">
          The battle you're looking for doesn't exist or has been removed.
        </p>
        {onReturnToLobby && (
          <button
            onClick={onReturnToLobby}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Return to Lobby
          </button>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 bg-yellow-900/20 border border-yellow-500 rounded-lg text-center">
        <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Authentication Required</h2>
        <p className="text-yellow-300">
          You must be logged in to participate in battles.
        </p>
      </div>
    );
  }

  // Verify user is a participant in this battle
  const isParticipant = user.id === battle.challenger_id || user.id === battle.opponent_id;
  if (!isParticipant) {
    return (
      <div className="p-8 bg-red-900/20 border border-red-500 rounded-lg text-center">
        <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
        <p className="text-red-300 mb-4">
          You are not a participant in this battle.
        </p>
        {onReturnToLobby && (
          <button
            onClick={onReturnToLobby}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Return to Lobby
          </button>
        )}
      </div>
    );
  }

  // Debug info (development only)
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Render appropriate phase component based on battle status
  const renderPhase = () => {
    switch (battle.status) {
      case 'active':
        return (
          <PhaseErrorBoundary phaseName="Card Selection" onRetry={onRefresh}>
            <CardSelectionPhase
              battle={battle}
              user={user}
              playerHasSelected={playerHasSelected}
              opponentHasSelected={opponentHasSelected}
              lastUpdateTime={lastUpdateTime}
              onCardSelected={onCardSelected}
            />
          </PhaseErrorBoundary>
        );

      case 'cards_revealed':
        if (!playerCard || !opponentCard) {
          return (
            <div className="p-8 bg-yellow-900/20 border border-yellow-500 rounded-lg text-center">
              <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-yellow-400 mb-2">Cards Loading</h2>
              <p className="text-yellow-300 mb-4">
                Waiting for card data to load...
              </p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="flex items-center space-x-2 mx-auto px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              )}
            </div>
          );
        }
        
        console.log('Rendering CardsRevealedPhase with battle:', battle.id);
        
        return (
          <PhaseErrorBoundary phaseName="Cards Revealed" onRetry={onRefresh}>
            <CardsRevealedPhase
              battle={battle}
              playerCard={playerCard}
              opponentCard={opponentCard}
              user={user}
              onResolutionTriggered={() => {
                console.log('Resolution triggered, refreshing battle data');
                if (onResolutionTriggered) {
                  onResolutionTriggered();
                }
                if (onRefresh) {
                  // Refresh battle data after a short delay to allow the server to process
                  setTimeout(onRefresh, 1000);
                }
              }}
            />
          </PhaseErrorBoundary>
        );

      case 'in_progress':
        if (!playerCard || !opponentCard) {
          return (
            <div className="p-8 bg-yellow-900/20 border border-yellow-500 rounded-lg text-center">
              <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-yellow-400 mb-2">Cards Loading</h2>
              <p className="text-yellow-300 mb-4">
                Battle is in progress but card data is still loading...
              </p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="flex items-center space-x-2 mx-auto px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              )}
            </div>
          );
        }
        
        return (
          <PhaseErrorBoundary phaseName="Battle In Progress" onRetry={onRefresh}>
            <BattleInProgressPhase
              battle={battle}
              playerCard={playerCard}
              opponentCard={opponentCard}
              onBattleComplete={onBattleComplete}
            />
          </PhaseErrorBoundary>
        );

      case 'completed':
        if (!playerCard || !opponentCard) {
          return (
            <div className="p-8 bg-yellow-900/20 border border-yellow-500 rounded-lg text-center">
              <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-yellow-400 mb-2">Battle Completed</h2>
              <p className="text-yellow-300 mb-4">
                Battle is completed but card data is not available for display.
              </p>
              {onReturnToLobby && (
                <button
                  onClick={onReturnToLobby}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Return to Lobby
                </button>
              )}
            </div>
          );
        }
        
        return (
          <PhaseErrorBoundary phaseName="Battle Completed" onRetry={onRefresh}>
            <BattleCompletedPhase
              battle={battle}
              playerCard={playerCard}
              opponentCard={opponentCard}
              user={user}
              onReturnToLobby={onReturnToLobby}
              onFindNewBattle={onFindNewBattle}
            />
          </PhaseErrorBoundary>
        );

      default:
        return (
          <div className="p-8 bg-red-900/20 border border-red-500 rounded-lg text-center">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">Unknown Battle Status</h2>
            <p className="text-red-300 mb-4">
              Battle status "{battle.status}" is not recognized.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Expected: active, cards_revealed, in_progress, or completed
            </p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center space-x-2 mx-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Battle</span>
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Development Debug Info */}
      {isDevelopment && (
        <div className="p-3 bg-gray-900/50 border border-gray-700 rounded text-xs text-gray-400">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <strong>Status:</strong> {battle.status}
            </div>
            <div>
              <strong>Phase:</strong> {getBattlePhaseDisplayName(battle.status)}
            </div>
            <div>
              <strong>Player Selected:</strong> {playerHasSelected ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Opponent Selected:</strong> {opponentHasSelected ? 'Yes' : 'No'}
            </div>
          </div>
          {lastUpdateTime && (
            <div className="mt-1">
              <strong>Last Update:</strong> {lastUpdateTime}
            </div>
          )}
        </div>
      )}

      {/* Phase Component */}
      {renderPhase()}
    </div>
  );
};