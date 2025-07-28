/**
 * Consolidated Battle Types
 * 
 * This file consolidates all battle-related types from battle.ts and battle-v2.ts
 * into a single source of truth. The V2 types are preferred as they represent
 * the current active battle system.
 */

import { Card } from './game';

// =============================================================================
// CORE BATTLE TYPES (V2 - Active System)
// =============================================================================

/**
 * Battle status values for the current V2 system
 */
export type BattleStatus = 
  | 'pending'          // Challenge initiated, waiting for opponent to accept
  | 'active'           // Card selection phase
  | 'cards_revealed'   // Cards revealed, countdown to resolution
  | 'in_progress'      // Battle resolution in progress
  | 'completed';       // Battle finished

/**
 * Battle instance for V2 system - primary interface
 */
export interface BattleInstance {
  id: string;
  created_at: string;
  challenger_id: string;
  opponent_id: string;
  status: BattleStatus;
  winner_id?: string;
  completed_at?: string;
  updated_at?: string;
  explanation?: string;
}

/**
 * Humanoid card interface - extends Card with humanoid-specific constraints
 */
export interface HumanoidCard extends Card {
  card_type: 'humanoid';
  attributes: {
    str: number;
    dex: number;
    int: number;
  };
}

/**
 * Battle phases in the V2 system
 */
export type BattlePhase = 
  | 'loading'
  | 'card_selection'
  | 'cards_revealed'
  | 'battle_in_progress'
  | 'battle_completed'
  | 'error';

/**
 * Battle state for the V2 system
 */
export interface BattleState {
  battle: BattleInstance | null;
  playerCard: HumanoidCard | null;
  opponentCard: HumanoidCard | null;
  phase: BattlePhase;
  loading: boolean;
  error: string | null;
  lastUpdated: string;
}

/**
 * Battle actions that users can perform
 */
export type BattleAction = 
  | { type: 'SELECT_CARD'; cardId: string }
  | { type: 'CONFIRM_SELECTION' }
  | { type: 'TRIGGER_RESOLUTION' }
  | { type: 'RETURN_TO_LOBBY' }
  | { type: 'FIND_NEW_BATTLE' };

/**
 * Real-time events for battle updates
 */
export interface BattleRealtimeEvent {
  type: 'card_selected' | 'battle_resolved' | 'player_joined' | 'player_left' | 'battle_updated';
  battleId: string;
  playerId: string;
  timestamp: string;
  data?: {
    cardId?: string;
    battleStatus?: BattleStatus;
    bothPlayersReady?: boolean;
    winnerId?: string;
  };
}

/**
 * Card selection state
 */
export interface CardSelectionState {
  selectedCardId: string | null;
  isConfirmed: boolean;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Battle participant information
 */
export interface BattleParticipant {
  id: string;
  username: string;
  hasSelectedCard: boolean;
  selectedAt?: string;
  card?: HumanoidCard;
}

/**
 * Battle result information
 */
export interface BattleResult {
  winnerId: string;
  loserId: string;
  explanation: string;
  playerCard: HumanoidCard;
  opponentCard: HumanoidCard;
  transferredCardId?: string;
}

/**
 * Error codes for battle operations
 */
export enum BattleErrorCode {
  INVALID_CARD_TYPE = 'INVALID_CARD_TYPE',
  CARD_NOT_OWNED = 'CARD_NOT_OWNED',
  BATTLE_NOT_FOUND = 'BATTLE_NOT_FOUND',
  INVALID_BATTLE_STATE = 'INVALID_BATTLE_STATE',
  PLAYER_NOT_IN_BATTLE = 'PLAYER_NOT_IN_BATTLE',
  CARD_ALREADY_SELECTED = 'CARD_ALREADY_SELECTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  REALTIME_CONNECTION_LOST = 'REALTIME_CONNECTION_LOST',
  HUMANOID_CARDS_ONLY = 'HUMANOID_CARDS_ONLY'
}

/**
 * Battle error with code and details
 */
export interface BattleError {
  code: BattleErrorCode;
  message: string;
  details?: string;
}

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

// =============================================================================
// LEGACY TYPES (V1 - Deprecated but kept for backward compatibility)
// =============================================================================

/**
 * @deprecated Use BattleStatus instead
 * Legacy battle status values - kept for backward compatibility
 */
export type LegacyBattleStatus = 'awaiting_opponent' | 'in_progress' | 'completed' | 'selecting' | 'cards_revealed' | 'active' | 'pending' | 'cancelled' | 'declined';

/**
 * @deprecated Use HumanoidCard instead
 * Legacy battle card representation for UI components
 */
export interface LegacyBattleCard {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  type: string;
  attributes?: Record<string, any>;
}

/**
 * @deprecated Use BattleInstance instead
 * Legacy battle instance - kept for backward compatibility during transition
 */
export interface LegacyBattleInstance {
  id: string;
  created_at: string;
  challenger_id: string;
  opponent_id?: string;
  status: LegacyBattleStatus;
  winner_id?: string;
  completed_at?: string;
  turn?: 'challenger' | 'opponent';
  transfer_completed?: boolean;
  explanation?: string | null;
  updated_at?: string;
}

/**
 * @deprecated Use BattleInstance instead
 * Legacy battle lobby - kept for backward compatibility during transition
 */
export interface LegacyBattleLobby {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  status: LegacyBattleStatus;
  created_at: string;
  updated_at?: string;
  winner_id: string | null;
  completed_at: string | null;
  transfer_completed?: boolean;
  explanation?: string | null;
}

/**
 * Battle selection - matches battle_selections table schema
 * Still used by some legacy components
 */
export interface BattleSelection {
  id: string;
  battle_id: string;
  player1_id: string | null;
  player1_card_id: string | null;
  player1_submitted_at: string | null;
  player2_id: string | null;
  player2_card_id: string | null;
  player2_submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated No longer used
 * Legacy battle state - replaced by direct queries to battle_selections table
 */
export interface LegacyBattleState {
  player1_cards?: string[];
  player2_cards?: string[];
  player1_ready?: boolean;
  player2_ready?: boolean;
  turn?: 'player1' | 'player2';
  player1_health?: number;
  player2_health?: number;
  player1_deck?: string[];
  player2_deck?: string[];
  player1_hand?: string[];
  player2_hand?: string[];
  log?: string[];
  winner?: 'player1' | 'player2' | null;
}

// =============================================================================
// TYPE ALIASES FOR BACKWARD COMPATIBILITY
// =============================================================================

/**
 * @deprecated Use BattleStatus instead
 */
export type BattleStatusLegacy = LegacyBattleStatus;

/**
 * @deprecated Use HumanoidCard instead
 */
export type BattleCard = LegacyBattleCard;

/**
 * @deprecated Use BattleState instead
 */
export type BattleStateLegacy = LegacyBattleState;