import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';

// Create a single Supabase client instance for client-side use
const supabase = createClientComponentClient<Database>();

// Export the client instance directly for backward compatibility
export { supabase };

// Export a function that returns the client instance. This is the new standard.
export const createClient = () => supabase;

// Helper function to safely fetch card data with error handling
export const fetchCardSafely = async (cardId: string | undefined): Promise<any> => {
  if (!cardId) {
    console.log('fetchCardSafely called with undefined cardId');
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('player_cards')
      .select('id, player_id, card_id, card_name, card_image_url, rarity, nft_id, owner_address, attributes, created_at, updated_at')
      .eq('id', cardId)
      .single();
    
    if (error) {
      console.error(`Error fetching card ${cardId}:`, JSON.stringify(error, null, 2));
      return null;
    }
    
    return data;
  } catch (err) {
    console.error(`Exception fetching card ${cardId}:`, 
      err instanceof Error ? err.message : JSON.stringify(err));
    return null;
  }
};

// Helper function to safely fetch battle cards
export const fetchBattleCardsSafely = async (battleId: string | undefined) => {
  if (!battleId) return [];
  
  try {
    const { data, error } = await supabase
      .from('battle_cards')
      .select('*')
      .eq('battle_id', battleId);
    
    if (error) {
      console.error(`Error fetching battle cards for battle ${battleId}:`, error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error(`Exception fetching battle cards for battle ${battleId}:`, err);
    return [];
  }
};

// Helper function to count battle cards safely
export const countBattleCardsSafely = async (battleId: string | undefined) => {
  if (!battleId) return 0;
  
  try {
    const { count, error } = await supabase
      .from('battle_cards')
      .select('*', { count: 'exact', head: true })
      .eq('battle_id', battleId);
    
    if (error) {
      console.error(`Error counting battle cards for battle ${battleId}:`, error);
      return 0;
    }
    
    return count || 0;
  } catch (err) {
    console.error(`Exception counting battle cards for battle ${battleId}:`, err);
    return 0;
  }
};

// Helper function to safely fetch player cards with proper joins
export const fetchPlayerCardsSafely = async (playerId: string | undefined) => {
  if (!playerId) {
    console.log('fetchPlayerCardsSafely called with undefined playerId');
    return [];
  }
  
  try {
    // Properly structure the query with correct foreign key relationship
    const { data, error } = await supabase
      .from('player_cards')
      .select(`
        id,
        player_id,
        card_id,
        cards:card_id(*)
      `)
      .eq('player_id', playerId)
      .order('id', { ascending: false });
    
    if (error) {
      console.error(`Error fetching player cards for player ${playerId}:`, error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error(`Exception fetching player cards for player ${playerId}:`, err);
    return [];
  }
};

