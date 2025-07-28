/**
 * Hook interfaces for Battle V2 system
 */

import { HumanoidCard, BattleInstance, BattleRealtimeEvent } from '@/types/battle-consolidated';

/**
 * useBattleState hook return type
 */
export interface UseBattleStateReturn {
  battle: BattleInstance | null;
  playerCard: HumanoidCard | null;
  opponentCard: HumanoidCard | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectCard: (cardId: string) => Promise<void>;
  playerHasSelected: boolean;
  opponentHasSelected: boolean;
}

/**
 * useBattleRealtime hook return type
 */
export interface UseBattleRealtimeReturn {
  isConnected: boolean;
  lastEvent: BattleRealtimeEvent | null;
  connectionError: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * useHumanoidCards hook return type
 */
export interface UseHumanoidCardsReturn {
  humanoidCards: HumanoidCard[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * useBattleActions hook return type
 */
export interface UseBattleActionsReturn {
  selectCard: (cardId: string) => Promise<void>;
  confirmSelection: () => Promise<void>;
  triggerResolution: () => Promise<void>;
  isProcessing: boolean;
  actionError: string | null;
  clearError: () => void;
}

/**
 * useCountdownTimer hook return type
 */
export interface UseCountdownTimerReturn {
  seconds: number;
  isActive: boolean;
  isComplete: boolean;
  start: (initialSeconds: number) => void;
  stop: () => void;
  reset: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * Hook configuration options
 */
export interface BattleHookOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealtime?: boolean;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}