import type { Profile, PlayerInventory, Card, ActiveTimer } from './game';

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
    };
  };
}
