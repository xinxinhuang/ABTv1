/**
 * @deprecated This file contains legacy battle types. Use @/types/battle-consolidated instead.
 * These types are kept only for backward compatibility with legacy battle components.
 */

/**
 * @deprecated Use BattleStatus from @/types/battle-consolidated instead
 * Legacy battle status values - kept for backward compatibility
 */
export type BattleStatus = 'awaiting_opponent' | 'in_progress' | 'completed' | 'selecting' | 'cards_revealed' | 'active' | 'pending' | 'cancelled' | 'declined';

/**
 * @deprecated Use HumanoidCard from @/types/battle-consolidated instead
 * Legacy battle card representation for UI components
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
 * @deprecated Use BattleInstance from @/types/battle-consolidated instead
 * Legacy battle instance - kept for backward compatibility with legacy components
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
 * @deprecated Still used by legacy battle components
 * Battle selection - matches battle_selections table schema
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
