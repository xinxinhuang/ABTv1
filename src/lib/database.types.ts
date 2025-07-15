export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      player_inventory: {
        Row: {
          id: string
          player_id: string
          humanoid_packs: number
          weapon_packs: number
          updated_at: string
        }
        Insert: {
          id?: string
          player_id: string
          humanoid_packs?: number
          weapon_packs?: number
          updated_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          humanoid_packs?: number
          weapon_packs?: number
          updated_at?: string
        }
      }
      player_cards: {
        Row: {
          id: string
          player_id: string
          card_type: string
          card_name: string
          attributes: Json
          rarity: string
          obtained_at: string
        }
        Insert: {
          id?: string
          player_id: string
          card_type: string
          card_name: string
          attributes: Json
          rarity: string
          obtained_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          card_type?: string
          card_name?: string
          attributes?: Json
          rarity?: string
          obtained_at?: string
        }
      }
      active_timers: {
        Row: {
          id: string
          player_id: string
          pack_type: string
          start_time: string
          target_delay_hours: number
          status: string
        }
        Insert: {
          id?: string
          player_id: string
          pack_type: string
          start_time?: string
          target_delay_hours: number
          status?: string
        }
        Update: {
          id?: string
          player_id?: string
          pack_type?: string
          start_time?: string
          target_delay_hours?: number
          status?: string
        }
      }
      pack_opening_history: {
        Row: {
          id: string
          player_id: string
          pack_type: string
          opened_at: string
          cards_received: Json
        }
        Insert: {
          id?: string
          player_id: string
          pack_type: string
          opened_at?: string
          cards_received: Json
        }
        Update: {
          id?: string
          player_id?: string
          pack_type?: string
          opened_at?: string
          cards_received?: Json
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_or_create_inventory: {
        Args: {
          p_player_id: string
          p_pack_type: string
        }
        Returns: {
          humanoid_packs: number
          weapon_packs: number
        }[]
      }
      decrement_inventory: {
        Args: {
          p_player_id: string
          p_column_name: string
          p_amount?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
