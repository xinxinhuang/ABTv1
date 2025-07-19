'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  const supabase = createClient();

  // Convert battleId to string
  const battleIdString = Array.isArray(battleId) ? battleId[0] : battleId || '';

  // State for UI interactions
  const [refreshing, setRefreshing] = useState(false);
  const [checkingSelection, setCheckingSelection] = useState(true);
  const [playerHasSelected, setPlayerHasSelected] = useState(false);
  const [opponentHasSelected, setOpponentHasSelected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  // Custom hooks for battle state management
  const { battle, selection, loading, error, refresh } = useBattleData(battleIdString);
  const { player1Card, player2Card, cardsLoading, refetchCards } = useCardFetching(battle, selection, user);
  const { triggerResolution, isResolving, resolutionError, autoTriggerResolution } = useBattleResolution(battle, selection);
  const { seconds: countdownSeconds, start: startCountdown } = useCountdown();

  // Update selection status when data changes
  useEffect(() => {
    if (!user || !battle || !selection) {
      setPlayerHasSelected(false);
      setOpponentHasSelected(false);
      return;
    }

    const isChallenger = user.id === battle.challenger_id;
    const hasSelected = isChallenger ? !!selection.player1_card_id : !!selection.player2_card_id;
    const opponentSelected = isChallenger ? !!selection.player2_card_id : !!selection.player1_card_id;

    setPlayerHasSelected(hasSelected);
    setOpponentHasSelected(opponentSelected);
    setCheckingSelection(false);

    if (opponentSelected) {
      setLastUpdateTime(new Date().toLocaleTimeString());
    }
  }, [user, battle, selection]);

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
        console.log('⏰ Countdown completed, triggering resolution');

        // Double-check battle status before attempting resolution
        try {
          const { data: currentBattle, error: checkError } = await supabase
            .from('battle_instances')
            .select('status')
            .eq('id', battle.id)
            .single();

          if (checkError || !currentBattle) {
            console.error('Error checking battle status:', checkError);
            return;
          }

          if (currentBattle.status === 'completed') {
            console.log('Battle already completed by another player, skipping resolution');
            // Just refresh to show the completed state
            setTimeout(() => refresh(), 100);
            return;
          }

          // Battle is still in cards_revealed state, proceed with resolution
          const { data, error } = await supabase.functions.invoke('resolve-battle-v2', {
            body: { battle_id: battle.id }
          });

          if (error) {
            console.error('Error resolving battle:', error);
            // Even if resolution fails, refresh to get latest state
            setTimeout(() => refresh(), 500);
          } else {
            console.log('✅ Battle resolved successfully:', data);
            // Force refresh after resolution
            setTimeout(() => refresh(), 500);
          }
        } catch (err) {
          console.error('Error in resolution process:', err);
          // Always refresh to get latest state
          setTimeout(() => refresh(), 500);
        }
      });
    }
  }, [battle?.status, battle?.id, selection?.player1_card_id, selection?.player2_card_id, startCountdown, supabase, refresh]);

  // Fetch initial data
  useEffect(() => {
    if (battleIdString && user) {
      refresh();
    }
  }, [battleIdString, user, refresh]);

  // Refetch cards when selection changes
  useEffect(() => {
    if (selection && (selection.player1_card_id || selection.player2_card_id)) {
      refetchCards();
    }
  }, [selection, refetchCards]);

  // Real-time subscription callbacks
  const subscriptionCallbacks = {
    onBattleUpdate: useCallback((updatedBattle: any) => {
      console.log('📡 Battle updated via subscription:', updatedBattle);
      // Force immediate refresh when battle status changes
      setTimeout(() => refresh(), 100);
    }, [refresh]),

    onSelectionUpdate: useCallback((updatedSelection: any) => {
      console.log('📡 Selection updated via subscription:', updatedSelection);
      setTimeout(() => refresh(), 100);
    }, [refresh]),

    onCardSubmitted: useCallback((payload: any) => {
      console.log('📡 Card submitted via broadcast:', payload);
      setTimeout(() => refresh(), 100);
    }, [refresh]),

    onBattleStatusChange: useCallback((payload: any) => {
      console.log('📡 Battle status changed via broadcast:', payload);
      setTimeout(() => refresh(), 100);
    }, [refresh]),
  };

  // Set up real-time subscriptions
  const { isConnected, subscriptionError } = useBattleSubscriptions(
    battleIdString,
    user,
    subscriptionCallbacks
  );

  // Handle card selection
  const handleCardSelection = useCallback(async (cardId: string) => {
    if (!user || !battle || playerHasSelected) return;

    try {
      console.log(`Player ${user.id} selected card ${cardId} for battle ${battle.id}`);
      setPlayerHasSelected(true);

      // The CardSelectionGrid component handles the actual submission
      // We just update the UI state here
      setTimeout(() => {
        refresh();
      }, 1000);

    } catch (error) {
      console.error('Error handling card selection:', error);
      setPlayerHasSelected(false);
    }
  }, [user, battle, playerHasSelected, refresh]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      if (selection) {
        await refetchCards();
      }
    } catch (error) {
      console.error('Error refreshing battle data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, refetchCards, selection]);

  // Handle manual battle resolution
  const handleResolveBattle = useCallback(async () => {
    if (!battle?.id) return;

    console.log('Manually triggering battle resolution for battle:', battle.id);
    await triggerResolution();
  }, [battle?.id, triggerResolution]);

  // Navigation handlers
  const handleReturnToGame = useCallback(() => {
    router.push('/game');
  }, [router]);

  const handleFindNewBattle = useCallback(() => {
    router.push('/game/arena/lobby');
  }, [router]);

  // Redirect if user not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Show loading state
  if (loading || !user) {
    return (
      <div className="content-height">
        <div className="text-center p-8">
          <Loader2 className="mx-auto h-12 w-12 animate-spin" />
          <p className="mt-4">Loading Battle...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="content-height">
        <div className="p-4 text-xl font-bold text-red-500">
          Error: {error}
          <button
            onClick={handleRefresh}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-height">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Battle Arena - {battle?.id}</h1>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {/* Manual resolve button for development */}
            {process.env.NODE_ENV === 'development' && battle?.status === 'cards_revealed' && (
              <button
                onClick={handleResolveBattle}
                disabled={isResolving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 text-sm"
              >
                {isResolving ? 'Resolving...' : 'Force Resolve'}
              </button>
            )}
          </div>
        </div>

        {/* Debug Panel - Development Only */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
            <h3 className="text-sm font-bold text-yellow-400 mb-2">🔧 Debug Info</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p><strong>Battle Status:</strong> {battle?.status || 'N/A'}</p>
                <p><strong>Battle ID:</strong> {battle?.id || 'N/A'}</p>
                <p><strong>User ID:</strong> {user?.id?.slice(0, 8) || 'N/A'}...</p>
                <p><strong>Is Challenger:</strong> {user?.id === battle?.challenger_id ? 'Yes' : 'No'}</p>
                <p><strong>Connected:</strong> {isConnected ? '✅' : '❌'}</p>
              </div>
              <div>
                <p><strong>Player1 Card:</strong> {selection?.player1_card_id ? '✅' : '❌'}</p>
                <p><strong>Player2 Card:</strong> {selection?.player2_card_id ? '✅' : '❌'}</p>
                <p><strong>Cards Loading:</strong> {cardsLoading ? '⏳' : '✅'}</p>
                <p><strong>Countdown:</strong> {countdownSeconds > 0 ? `${countdownSeconds}s` : 'N/A'}</p>
                <p><strong>Resolution Error:</strong> {resolutionError ? '❌' : '✅'}</p>
              </div>
            </div>
            {subscriptionError && (
              <p className="text-red-400 text-xs mt-2">Subscription Error: {subscriptionError}</p>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-3/4">
            <BattlePhaseRenderer
              battle={battle}
              selection={selection}
              player1Card={player1Card}
              player2Card={player2Card}
              user={user}
              countdownSeconds={countdownSeconds}
              checkingSelection={checkingSelection}
              playerHasSelected={playerHasSelected}
              opponentHasSelected={opponentHasSelected}
              lastUpdateTime={lastUpdateTime}
              onCardSelection={handleCardSelection}
              onResolveBattle={handleResolveBattle}
              onReturnToGame={handleReturnToGame}
              onFindNewBattle={handleFindNewBattle}
            />
          </div>

          {/* Game Log Sidebar */}
          <div className="w-full lg:w-1/4">
            {battle && <GameLog battleState={battle} />}
          </div>
        </div>
      </div>
    </div>
  );
}