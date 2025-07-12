import type { Profile, PlayerInventory, Card, ActiveTimer, BattleInstance, BattleCard, BattleResult, BattleNotification } from './game';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      player_inventory: {
        Row: PlayerInventory;
        Insert: Omit<PlayerInventory, 'id'>;
        Update: Partial<Omit<PlayerInventory, 'id'>>;
      };
      player_cards: {
        Row: Card;
        Insert: Omit<Card, 'id' | 'obtained_at'>;
        Update: Partial<Omit<Card, 'id' | 'obtained_at'>>;
      };
      active_timers: {
        Row: ActiveTimer;
        Insert: Omit<ActiveTimer, 'id'>;
        Update: Partial<Omit<ActiveTimer, 'id'>>;
      };
      battle_instances: {
        Row: BattleInstance;
        Insert: Omit<BattleInstance, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BattleInstance, 'id' | 'created_at'>>;
      };
      battle_cards: {
        Row: BattleCard;
        Insert: Omit<BattleCard, 'id' | 'created_at'>;
        Update: Partial<Omit<BattleCard, 'id' | 'created_at'>>;
      };
      battle_results: {
        Row: BattleResult;
        Insert: Omit<BattleResult, 'id' | 'created_at'>;
        Update: Partial<Omit<BattleResult, 'id' | 'created_at'>>;
      };
      battle_notifications: {
        Row: BattleNotification;
        Insert: Omit<BattleNotification, 'id' | 'created_at'>;
        Update: Partial<Omit<BattleNotification, 'id' | 'created_at'>>;
      };
    };
  };
}
