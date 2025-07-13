/**
 * Battle status values used across the battle system
 */
export type BattleStatus = 'awaiting_opponent' | 'in_progress' | 'completed' | 'selecting' | 'cards_revealed' | 'active' | 'pending' | 'cancelled' | 'declined';

/**
 * Battle card representation for UI components
 */
export interface BattleCard {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  type: string;
  attributes?: Record<string, any>;
}

/**
 * Battle instance - matches battle_instances table schema
 */
export interface BattleInstance {
  id: string;
  created_at: string;
  challenger_id: string;
  opponent_id?: string;
  status: BattleStatus;
  winner_id?: string;
  completed_at?: string;
  turn?: 'challenger' | 'opponent';
  transfer_completed?: boolean;
  explanation?: string | null;
  updated_at?: string;
}

/**
 * Battle selection - matches battle_selections table schema
 */
export interface BattleSelection {
  id: string;
  lobby_id: string;
  player_id: string;
  player_card_id: string;
  created_at: string;
}

/**
 * @deprecated Use BattleInstance instead
 * Kept for backward compatibility during transition
 */
export interface BattleLobby {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  status: BattleStatus;
  created_at: string;
  updated_at?: string;
  winner_id: string | null;
  completed_at: string | null;
  transfer_completed?: boolean;
  explanation?: string | null;
}

/**
 * @deprecated No longer used
 * Replaced by direct queries to battle_selections table
 */
export interface BattleState {
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
