/**
 * useBattleRealtime Hook
 * Manages real-time subscriptions for battle updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { BattleRealtimeEvent } from '@/types/battle-v2';
import { UseBattleRealtimeReturn } from './types';
import { BATTLE_CONFIG } from '@/lib/battle-v2/types';

/**
 * Custom hook for managing battle real-time subscriptions
 */
export function useBattleRealtime(
  battleId: string,
  onBattleUpdate?: (data: any) => void,
  onCardUpdate?: (data: any) => void
): UseBattleRealtimeReturn {
  const { user } = useUser();
  const supabase = createClient();
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<BattleRealtimeEvent | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  /**
   * Handle battle instance updates
   */
  const handleBattleUpdate = useCallback((payload: any) => {
    console.log('Battle update received:', payload);
    
    const event: BattleRealtimeEvent = {
      type: 'battle_updated',
      battleId,
      playerId: user?.id || '',
      timestamp: new Date().toISOString(),
      data: {
        battleStatus: payload.new?.status,
        winnerId: payload.new?.winner_id
      }
    };
    
    setLastEvent(event);
    
    if (onBattleUpdate) {
      onBattleUpdate(payload.new);
    }
  }, [battleId, user?.id, onBattleUpdate]);

  /**
   * Handle battle cards updates
   */
  const handleCardUpdate = useCallback((payload: any) => {
    console.log('Card update received:', payload);
    
    const event: BattleRealtimeEvent = {
      type: 'card_selected',
      battleId,
      playerId: payload.new?.player_id || '',
      timestamp: new Date().toISOString(),
      data: {
        cardId: payload.new?.card_id
      }
    };
    
    setLastEvent(event);
    
    if (onCardUpdate) {
      onCardUpdate(payload.new);
    }
  }, [battleId, onCardUpdate]);

  /**
   * Handle broadcast events (for immediate updates)
   */
  const handleBroadcast = useCallback((payload: any) => {
    console.log('Broadcast received:', payload);
    
    const event: BattleRealtimeEvent = {
      type: payload.event || 'battle_updated',
      battleId,
      playerId: payload.player_id || '',
      timestamp: payload.timestamp || new Date().toISOString(),
      data: payload
    };
    
    setLastEvent(event);
  }, [battleId]);

  /**
   * Connect to real-time subscriptions
   */
  const connect = useCallback(async () => {
    if (!battleId || !user) return;

    try {
      setConnectionError(null);
      
      // Clean up existing channel
      if (channelRef.current) {
        await channelRef.current.unsubscribe();
      }

      // Create new channel
      const channel = supabase.channel(`battle-v2:${battleId}`, {
        config: {
          broadcast: { self: true }
        }
      });

      // Subscribe to battle instance changes
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_instances',
          filter: `id=eq.${battleId}`
        },
        handleBattleUpdate
      );

      // Subscribe to battle cards changes
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_cards',
          filter: `battle_id=eq.${battleId}`
        },
        handleCardUpdate
      );

      // Subscribe to broadcast events
      channel.on('broadcast', { event: '*' }, ({ payload }) => {
        handleBroadcast(payload);
      });

      // Handle subscription status
      channel.on('system', {}, (payload) => {
        console.log('Subscription status:', payload);
        
        if (payload.status === 'SUBSCRIBED') {
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          console.log(`Connected to battle ${battleId} real-time updates`);
        } else if (payload.status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionError('Subscription error occurred');
          scheduleReconnect();
        } else if (payload.status === 'CLOSED') {
          setIsConnected(false);
          console.log('Real-time connection closed');
        }
      });

      // Subscribe to the channel
      const subscriptionResult = await channel.subscribe();
      
      if (subscriptionResult === 'SUBSCRIBED') {
        channelRef.current = channel;
        setIsConnected(true);
      } else {
        throw new Error('Failed to subscribe to real-time updates');
      }

    } catch (err) {
      console.error('Error connecting to real-time:', err);
      setConnectionError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
      scheduleReconnect();
    }
  }, [battleId, user, supabase, handleBattleUpdate, handleCardUpdate, handleBroadcast]);

  /**
   * Disconnect from real-time subscriptions
   */
  const disconnect = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionError(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  /**
   * Schedule reconnection attempt
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= BATTLE_CONFIG.RECONNECTION_ATTEMPTS) {
      setConnectionError('Max reconnection attempts reached');
      return;
    }

    const delay = BATTLE_CONFIG.RECONNECTION_DELAY * Math.pow(2, reconnectAttemptsRef.current);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${BATTLE_CONFIG.RECONNECTION_ATTEMPTS}`);
      connect();
    }, delay);
  }, [connect]);

  /**
   * Manual reconnect function
   */
  const reconnect = useCallback(async () => {
    reconnectAttemptsRef.current = 0;
    await disconnect();
    await connect();
  }, [connect, disconnect]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (battleId && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [battleId, user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastEvent,
    connectionError,
    reconnect,
    disconnect
  };
}

/**
 * Hook for broadcasting battle events
 */
export function useBattleBroadcast(battleId: string) {
  const supabase = createClient();
  const { user } = useUser();

  const broadcast = useCallback(async (event: string, data: any) => {
    if (!battleId || !user) return;

    try {
      const channel = supabase.channel(`battle-v2:${battleId}`);
      
      await channel.send({
        type: 'broadcast',
        event,
        payload: {
          ...data,
          battle_id: battleId,
          player_id: user.id,
          timestamp: new Date().toISOString()
        }
      });

      // Clean up the channel
      await channel.unsubscribe();
      
    } catch (err) {
      console.error('Error broadcasting event:', err);
    }
  }, [battleId, user, supabase]);

  return { broadcast };
}