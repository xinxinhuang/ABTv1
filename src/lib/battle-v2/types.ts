/**
 * Battle V2 Utility Types and Constants
 */

import { HumanoidCard, BattleStatus } from '@/types/battle-consolidated';

/**
 * Battle configuration constants
 */
export const BATTLE_CONFIG = {
  CARD_SELECTION_TIMEOUT: 300, // 5 minutes in seconds
  CARDS_REVEALED_COUNTDOWN: 20, // 20 seconds countdown (increased from 10)
  MAX_BATTLE_DURATION: 1800, // 30 minutes max battle time
  RECONNECTION_ATTEMPTS: 3,
  RECONNECTION_DELAY: 2000, // 2 seconds
} as const;

/**
 * Battle phase transitions
 */
export const BATTLE_PHASE_TRANSITIONS: Record<BattleStatus, BattleStatus[]> = {
  'pending': ['active', 'completed'],
  'active': ['cards_revealed', 'completed'],
  'cards_revealed': ['in_progress', 'completed'],
  'in_progress': ['completed'],
  'completed': []
};

/**
 * Card attribute comparison result
 */
export interface AttributeComparison {
  attribute: keyof HumanoidCard['attributes'];
  playerValue: number;
  opponentValue: number;
  winner: 'player' | 'opponent' | 'tie';
}

/**
 * Battle calculation result
 */
export interface BattleCalculation {
  winner: 'player' | 'opponent' | 'tie';
  playerScore: number;
  opponentScore: number;
  attributeComparisons: AttributeComparison[];
  explanation: string;
}

/**
 * Real-time subscription configuration
 */
export interface RealtimeConfig {
  battleId: string;
  userId: string;
  onBattleUpdate?: (battle: any) => void;
  onCardUpdate?: (cards: any[]) => void;
  onPlayerUpdate?: (playerId: string, data: any) => void;
  onError?: (error: string) => void;
}

/**
 * API response types for select-card-v2
 */
export interface SelectCardResponse {
  success: boolean;
  message: string;
  data?: {
    battleStatus: BattleStatus;
    bothPlayersReady: boolean;
    nextPhase: string;
  };
  error?: {
    code: string;
    details: string;
  };
}

/**
 * Battle validation rules
 */
export interface BattleValidation {
  isValidCard: (card: any) => card is HumanoidCard;
  isValidBattleState: (status: string) => status is BattleStatus;
  canSelectCard: (battleStatus: BattleStatus) => boolean;
  canTriggerResolution: (battleStatus: BattleStatus) => boolean;
}

/**
 * Battle metrics for analytics
 */
export interface BattleMetrics {
  battleId: string;
  duration: number;
  cardSelectionTime: number;
  resolutionTime: number;
  playerActions: number;
  errors: string[];
  completedAt: string;
}