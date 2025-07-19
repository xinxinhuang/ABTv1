'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import {
  useBattleData,
  useBattleSubscriptions,
  useCardFetching,
  useBattleResolution,
  useCountdown
} from '@/hooks/battle';
import { BattlePhaseRenderer } from '@/components/game/battle/phases';
import { GameLog } from '@/components/game/battle/GameLog';

export default function BattlePage() {
  const { battleId } = useParams();
  const { user } = useUser();
  const router = useRouter();

  // Convert battleId to string
  const battleIdString = Array.isArray(battleId) ? battleId[0] : battleId || '';

  // State for UI interactions
  const [refreshing, setRefreshing] = useState(false);

  // Custom hooks for battle state management
  const { battle, selection, loading, error, refresh } = useBattleData(battleIdString);
  const { player1Card, player2Card, cardsLoading, refetchCards } = useCardFetching(battle, selection, user);
  const { triggerResolution, isResolving, resolutionError, autoTriggerResolution } = useBattleResolution(battle, selection);
  const { seconds: countdownSeconds, start: startCountdown } = useCountdown();

  // Track if countdown has been started for this battle
  const countdownStartedRef = useRef<Set<string>>(new Set());

  // Auto-trigger resolution for cards_revealed status (only once per battle)
  useEffect(() => {
    if (battle?.status === 'cards_revealed' &&
      selection?.player1_card_id &&
      selection?.player2_card_id &&
      battle?.id &&
      !countdownStartedRef.current.has(battle.id)) {

      console.log('🎯 Starting countdown for cards_revealed battle:', battle.id);
      countdownStartedRef.current.add(battle.id);

      startCountdown(8, async () => {
        console.log('⏰ Countdown completed, triggering auto-resolution');
        await autoTriggerResolution();
      });
    }
  }, [battle?.id, battle?.status, selection?.player1_card_id, selection?.player2_card_id, startCountdown, autoTriggerResolution]);

  // Fetch initial data
  useEffect(() => {
    if (battleIdString && user) {
      refresh();
    }
  }, [battleIdString, user, refresh]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      await refetchCards();
    } catch (err) {
      console.error('Error during manual refresh:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, refetchCards]);

  // Handle card selection confirmation
  const handleSelectionConfirmed = useCallback(async (cardId: string) => {
    if (!user || !battle || !cardId) return;
    console.log(`Player ${user.id} selected card ${cardId} for battle ${battle.id}`);
    // The CardSelectionGrid component handles the actual submission
    // Real-time subscriptions will update the state
  }, [user, battle]);

  // Check if both players have submitted their cards
  const bothPlayersSubmitted = useMemo(() => {
    return selection?.player1_card_id && selection?.player2_card_id;
  }, [selection]);

  // Track if the current user has submitted their card
  const hasSubmittedCard = useMemo(() => {
    if (!user || !selection || !battle) return false;
    const isChallenger = user.id === battle.challenger_id;
    return isChallenger ? !!selection.player1_card_id : !!selection.player2_card_id;
  }, [selection, user, battle]);

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-yellow-400 mb-4" />
          <p className="text-gray-300">Loading battle...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Battle Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push('/game/arena')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Return to Arena
          </button>
        </div>
      </div>
    );
  }

  // Render battle not found
  if (!battle) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-400 mb-2">Battle Not Found</h1>
          <p className="text-gray-300 mb-6">The battle you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/game/arena')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Return to Arena
          </button>
        </div>
      </div>
    );
  }

  // Render unauthorized access
  if (!user || (user.id !== battle.challenger_id && user.id !== battle.opponent_id)) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
          <p className="text-gray-300 mb-6">You don't have permission to view this battle.</p>
          <button
            onClick={() => router.push('/game/arena')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Return to Arena
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">Battle Arena</h1>
            <p className="text-gray-400">Battle ID: {battle.id.slice(0, 8)}...</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => router.push('/game/arena')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Arena
            </button>
          </div>
        </div>

        {/* Battle Status */}
        <div className="mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-400">Status:</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${battle.status === 'active' ? 'bg-blue-900 text-blue-300' :
                  battle.status === 'cards_revealed' ? 'bg-yellow-900 text-yellow-300' :
                    battle.status === 'completed' ? 'bg-green-900 text-green-300' :
                      'bg-gray-700 text-gray-300'
                  }`}>
                  {battle.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              {battle.status === 'cards_revealed' && countdownSeconds > 0 && (
                <div className="text-yellow-400 font-bold">
                  Resolving in {countdownSeconds}s...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Battle Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Battle Phase Renderer */}
          <div className="lg:col-span-3">
            <BattlePhaseRenderer
              battle={battle}
              selection={selection}
              player1Card={player1Card}
              player2Card={player2Card}
              user={user}
              countdownSeconds={countdownSeconds}
              onCardSelection={handleSelectionConfirmed}
              onResolveBattle={triggerResolution}
              onReturnToGame={() => router.push('/game/arena')}
              onFindNewBattle={() => router.push('/game/arena')}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Battle Info */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-400 mb-3">Battle Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Challenger:</span>
                    <span className="text-white">
                      {user.id === battle.challenger_id ? 'You' : 'Opponent'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Opponent:</span>
                    <span className="text-white">
                      {user.id === battle.opponent_id ? 'You' : 'Challenger'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cards Submitted:</span>
                    <span className="text-white">
                      {bothPlayersSubmitted ? '2/2' : hasSubmittedCard ? '1/2' : '0/2'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Game Log */}
              <GameLog battleId={battle.id} />

              {/* Debug Info (Development Only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-purple-400 mb-3">Debug Info</h3>
                  <div className="space-y-2 text-xs text-gray-400">
                    <div>Battle Status: {battle.status}</div>
                    <div>Cards Loading: {cardsLoading ? 'Yes' : 'No'}</div>
                    <div>Is Resolving: {isResolving ? 'Yes' : 'No'}</div>
                    <div>Player1 Card: {player1Card ? 'Loaded' : 'Missing'}</div>
                    <div>Player2 Card: {player2Card ? 'Loaded' : 'Missing'}</div>
                    {resolutionError && (
                      <div className="text-red-400">Resolution Error: {resolutionError}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}