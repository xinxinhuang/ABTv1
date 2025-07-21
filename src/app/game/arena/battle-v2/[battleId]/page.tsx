/**
 * Battle Page V2 - Clean Implementation
 * Rebuilt battle arena focusing on humanoid cards only
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useBattleState } from '@/hooks/battle-v2/useBattleState';
import { useBattleRealtime } from '@/hooks/battle-v2/useBattleRealtime';
import { BattlePhaseRenderer } from '@/components/game/battle-v2/phases/BattlePhaseRenderer';
import { BattleDebugPanel } from '@/components/game/battle-v2/BattleDebugPanel';
import { use } from 'react';

interface BattlePageProps {
  params: Promise<{ battleId: string }>;
}

export default function BattlePage({ params }: BattlePageProps) {
  const { battleId } = use(params);
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  // State management
  const [playerHasSelected, setPlayerHasSelected] = useState(false);
  const [opponentHasSelected, setOpponentHasSelected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Core hooks
  const {
    battle,
    playerCard,
    opponentCard,
    loading: battleLoading,
    error: battleError,
    refresh
  } = useBattleState(battleId);

  // Real-time subscriptions
  const {
    isConnected,
    lastEvent,
    connectionError,
    reconnect
  } = useBattleRealtime(
    battleId,
    handleBattleUpdate,
    handleCardUpdate
  );

  // Handle battle updates from real-time
  function handleBattleUpdate(battleData: any) {
    console.log('Real-time battle update:', battleData);
    setLastUpdateTime(new Date().toLocaleTimeString());
    
    // Refresh battle state to get latest data
    refresh();
  }

  // Handle card updates from real-time
  function handleCardUpdate(selectionData: any) {
    console.log('Real-time selection update:', selectionData);
    setLastUpdateTime(new Date().toLocaleTimeString());
    
    // Update selection status based on battle_selections data
    if (battle && user) {
      const isChallenger = user.id === battle.challenger_id;
      const newSelectionData = selectionData.new || selectionData;
      
      // Check player selection status
      if (isChallenger) {
        setPlayerHasSelected(!!newSelectionData.player1_card_id);
        setOpponentHasSelected(!!newSelectionData.player2_card_id);
      } else {
        setPlayerHasSelected(!!newSelectionData.player2_card_id);
        setOpponentHasSelected(!!newSelectionData.player1_card_id);
      }
    }
    
    // Refresh battle state to get latest cards
    refresh();
  }

  // Handle card selection
  const handleCardSelected = (cardId: string) => {
    console.log('Card selected:', cardId);
    setPlayerHasSelected(true);
    setLastUpdateTime(new Date().toLocaleTimeString());
  };

  // Handle battle resolution triggered
  const handleResolutionTriggered = () => {
    console.log('Battle resolution triggered');
    setLastUpdateTime(new Date().toLocaleTimeString());
  };

  // Handle battle completion
  const handleBattleComplete = () => {
    console.log('Battle completed');
    setLastUpdateTime(new Date().toLocaleTimeString());
  };

  // Navigation handlers
  const handleReturnToLobby = () => {
    router.push('/game/arena/lobby');
  };

  const handleFindNewBattle = () => {
    router.push('/game/arena/lobby');
  };

  // Error handling
  useEffect(() => {
    if (battleError) {
      setError(battleError);
    } else if (connectionError) {
      setError(`Connection error: ${connectionError}`);
    } else {
      setError(null);
    }
  }, [battleError, connectionError]);

  // Update selection status based on battle state
  useEffect(() => {
    if (battle && user) {
      // This would typically come from checking battle_cards table
      // For now, we'll rely on real-time updates to set these states
    }
  }, [battle, user, playerCard, opponentCard]);

  // Loading state
  if (userLoading || battleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-blue-400 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Loading Battle Arena</h1>
          <p className="text-gray-400">
            {userLoading ? 'Authenticating...' : 'Loading battle data...'}
          </p>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-purple-900 flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold text-red-400">Authentication Required</h1>
          <p className="text-red-300">You must be logged in to access the battle arena.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !battle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-purple-900 flex items-center justify-center">
        <div className="text-center space-y-4 p-8 max-w-md">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold text-red-400">Battle Error</h1>
          <p className="text-red-300">{error}</p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={refresh}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleReturnToLobby}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header with connection status */}
      <div className="sticky top-0 z-10 bg-black/20 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-white">Battle Arena V2</h1>
              {battle && (
                <span className="text-sm text-gray-400">
                  Battle ID: {battle.id.slice(0, 8)}...
                </span>
              )}
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${
                isConnected ? 'text-green-400' : 'text-red-400'
              }`}>
                {isConnected ? (
                  <Wifi className="h-4 w-4" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {!isConnected && (
                <button
                  onClick={reconnect}
                  className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Reconnect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Battle Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <span className="text-red-300">{error}</span>
              </div>
            </div>
          )}

          {/* Battle Phase Renderer */}
          <BattlePhaseRenderer
            battle={battle}
            user={user}
            playerCard={playerCard}
            opponentCard={opponentCard}
            playerHasSelected={playerHasSelected}
            opponentHasSelected={opponentHasSelected}
            lastUpdateTime={lastUpdateTime}
            onCardSelected={handleCardSelected}
            onResolutionTriggered={handleResolutionTriggered}
            onBattleComplete={handleBattleComplete}
            onReturnToLobby={handleReturnToLobby}
            onFindNewBattle={handleFindNewBattle}
            onRefresh={refresh}
          />
        </div>
      </div>

      {/* Debug Panel (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <BattleDebugPanel
          battle={battle}
          user={user}
          playerCard={playerCard}
          opponentCard={opponentCard}
          isConnected={isConnected}
          lastEvent={lastEvent}
          playerHasSelected={playerHasSelected}
          opponentHasSelected={opponentHasSelected}
        />
      )}
    </div>
  );
}