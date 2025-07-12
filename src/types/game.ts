export interface Card {
  id: string;
  player_id: string;
  card_type: 'humanoid' | 'weapon';
  card_name: string;
  attributes: CardAttributes;
  rarity: 'bronze' | 'silver' | 'gold';
  obtained_at: string;
}

export interface CardAttributes {
  [key: string]: number | undefined;
  str?: number;
  dex?: number;
  int?: number;
}

export interface ActiveTimer {
  id: string;
  player_id: string;
  pack_type: 'humanoid' | 'weapon';
  start_time: string;
  target_delay_hours: number;
  status: 'active' | 'ready' | 'completed';
}

export interface PlayerInventory {
  id: string;
  player_id: string;
  humanoid_packs: number;
  weapon_packs: number;
}

export interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

// Battle-related interfaces for the asynchronous battle system
export interface BattleInstance {
  id: string;
  player1_id: string;
  player2_id: string; // Cannot be null in DB, use placeholder UUID for pending challenges
  status: 'pending' | 'selecting' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
  winner_id: string | null;
  completed_at: string | null;
  transfer_completed: boolean;
}

export interface BattleCard {
  id: string;
  battle_id: string;
  player_id: string;
  card_id: string;
  created_at: string;
  is_hidden: boolean;
}

export interface BattleResult {
  id: string;
  battle_id: string;
  winner_id: string;
  loser_id: string;
  explanation: string;
  created_at: string;
  transferred_card_id: string;
  bonus_card_id: string;
}

export interface BattleNotification {
  id: string;
  battle_id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
