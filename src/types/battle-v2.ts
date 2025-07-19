/**
 * Battle Arena V2 Types
 * TypeScript interfaces for humanoid-only battle system
 */

import { Card } from './game';
import { User } from '@supabase/supabase-js';

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
 * Battle instance for V2 system
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
}

/**
 * Battle status values
 */
export type BattleStatus = 
  | 'active'           // Card selection phase
  | 'cards_revealed'   // Cards revealed, countdown to resolution
  | 'in_progress'      // Battle resolution in progress
  | 'completed';       // Battle finished

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