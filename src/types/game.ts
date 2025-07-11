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
