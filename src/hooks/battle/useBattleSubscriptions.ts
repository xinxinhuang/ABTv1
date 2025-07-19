'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BattleInstance, BattleSelection } from '@/types/battle';
import { User } from '@supabase/supabase-js';

export interface UseBattleSubscriptionsReturn {
  isConnected: boolean;
  lastUpdate: string;
  subscriptionError: string | null;
}

export interface BattleSubscriptionCallbacks {
  onBattleUpdate?: (battle: BattleInstance) => void;
  onSelectionUpdate?: (selection: BattleSelection) => void;
  onCardSubmitted?: (payload: any) => void;
  onBattleStatusChange?: (payload: any) => void;
}

export const useBattleSubscriptions = (
  battleId: string,
  user: User | null,
  callbacks: BattleSubscriptionCallbacks
): UseBattleSubscriptionsReturn => {
  const supabase = createClient();
  const subscriptionsRef = useRef<any[]>([]);
  const isConnectedRef = useRef(false);
  const lastUpdateRef = useRef<string>('');
  const subscriptionErrorRef = useRef<string | null>(null);
  const callbacksRef = useRef(callbacks);

  // Update callbacks ref when callbacks change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up battle subscriptions');
    subscriptionsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    subscriptionsRef.current = [];
    isConnectedRef.current = false;
  }, [supabase]);

  const setupSubscriptions = useCallback(async () => {
    if (!battleId || !user) {
      console.log('Missing battleId or user, skipping subscription setup');
      return;
    }

    console.log('🔄 Setting up real-time subscriptions for battle:', battleId);

    try {
      // 1. Database changes subscription for battle instances
      const dbBattleChannel = supabase
        .channel(`battle-db-instances:${battleId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'battle_instances',
          filter: `id=eq.${battleId}`,
        }, (payload) => {
          console.log('📡 Battle instance updated via DB subscription:', payload.new);
          lastUpdateRef.current = new Date().toISOString();
          
          if (payload.new && callbacksRef.current.onBattleUpdate) {
            callbacksRef.current.onBattleUpdate(payload.new as BattleInstance);
          }
        })
        .subscribe((status) => {
          console.log(`Battle instances subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            isConnectedRef.current = true;
          } else if (status === 'CHANNEL_ERROR') {
            subscriptionErrorRef.current = 'Failed to subscribe to battle updates';
            isConnectedRef.current = false;
          }
        });

      // 2. Database changes subscription for battle cards
      const dbCardsChannel = supabase
        .channel(`battle-db-cards:${battleId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'battle_cards',
          filter: `battle_id=eq.${battleId}`
        }, (payload) => {
          console.log('📡 Battle card updated via DB subscription:', payload.new);
          lastUpdateRef.current = new Date().toISOString();
          
          // Trigger a card submitted callback to refresh the battle data
          if (callbacksRef.current.onCardSubmitted) {
            callbacksRef.current.onCardSubmitted(payload);
          }
        })
        .subscribe((status) => {
          console.log(`Battle cards subscription status: ${status}`);
        });

      // 3. Broadcast channel for immediate updates
      const broadcastChannel = supabase
        .channel(`battle-broadcast:${battleId}`)
        .on('broadcast', { event: 'card_submitted' }, (payload) => {
          console.log('📢 Card submitted broadcast received:', payload);
          lastUpdateRef.current = new Date().toISOString();
          
          if (callbacksRef.current.onCardSubmitted) {
            callbacksRef.current.onCardSubmitted(payload);
          }
        })
        .on('broadcast', { event: 'battle_update' }, (payload) => {
          console.log('📢 Battle update broadcast received:', payload);
          lastUpdateRef.current = new Date().toISOString();
          
          if (callbacksRef.current.onBattleStatusChange) {
            callbacksRef.current.onBattleStatusChange(payload);
          }
        })
        .subscribe((status) => {
          console.log(`Battle broadcast subscription status: ${status}`);
        });

      // Store channel references for cleanup
      subscriptionsRef.current = [dbBattleChannel, dbCardsChannel, broadcastChannel];

    } catch (error) {
      console.error('Error setting up battle subscriptions:', error);
      subscriptionErrorRef.current = error instanceof Error ? error.message : 'Unknown subscription error';
      isConnectedRef.current = false;
    }
  }, [battleId, user, supabase]);

  // Setup subscriptions on mount and when battleId or user changes
  useEffect(() => {
    setupSubscriptions();
    return cleanup;
  }, [battleId, user?.id]); // Only depend on stable values

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isConnected: isConnectedRef.current,
    lastUpdate: lastUpdateRef.current,
    subscriptionError: subscriptionErrorRef.current,
  };
};