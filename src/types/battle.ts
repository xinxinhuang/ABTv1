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

export type BattleLobbyStatus = 'pending' | 'card_selection' | 'in_progress' | 'completed' | 'declined' | 'cancelled' | 'finished_player1_won' | 'finished_player2_won';

export interface BattleLobby {
  id: string;
  player1_id: string;
  player2_id: string;
  status: BattleLobbyStatus;
  battle_state: BattleState;
  created_at: string;
  winner_id: string | null;
}
