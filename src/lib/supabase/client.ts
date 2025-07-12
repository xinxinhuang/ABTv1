import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

// Configure Supabase client with appropriate headers to avoid 406 errors
export const supabase = createClientComponentClient<Database>({
  options: {
    global: {
      headers: {
        'Accept': 'application/json, text/plain, */*',  // Expanded Accept header to fix 406 errors
        'Content-Type': 'application/json'
      }
    }
    // Note: Auth options removed to fix TypeScript errors
    // Auth refresh will be handled with error catching in components
  }
});

// Import PostgrestError for proper type checking
import { PostgrestError } from '@supabase/supabase-js';

// Helper function to safely fetch card data with error handling and retry logic
export const fetchCardSafely = async (cardId: string | undefined, retryCount = 0): Promise<any> => {
  if (!cardId) {
    console.log('fetchCardSafely called with undefined cardId');
    return null;
  }
  
  try {
    // First check if card exists before doing anything else
    const checkResult = await supabase
      .from('player_cards')
      .select('count')
      .eq('id', cardId)
      .single();
      
    if (checkResult.error) {
      console.error(`Error checking if card ${cardId} exists:`, 
        JSON.stringify(checkResult.error, null, 2));
    } else if (checkResult.data?.count === 0) {
      console.error(`Card ${cardId} not found in database`);
      return null;
    }
    
    // Explicit select statement with all needed fields
    const result = await supabase
      .from('player_cards')
      .select('id, player_id, card_id, card_name, card_image_url, rarity, nft_id, owner_address, attributes, created_at, updated_at')
      .eq('id', cardId)
      .maybeSingle();
    
    if (result.error) {
      console.error(`Error fetching card ${cardId}:`, 
        JSON.stringify(result.error, null, 2));
      
      // If we got a 406 error and haven't exceeded retry attempts, try again with different approach
      const errorStatus = result.error.code === '406' || 
                        (result.error as any).status === 406 || 
                        result.error.message?.includes('Not Acceptable');
      if (errorStatus && retryCount < 2) {
        console.log(`Retrying card fetch with alternate method (attempt ${retryCount + 1})`);
        
        // Wait briefly before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try an alternative approach with broader query
        try {
          const alternateResult = await supabase
            .from('player_cards')
            .select('*')
            .eq('id', cardId)
            .limit(1);
            
          if (!alternateResult.error && alternateResult.data && alternateResult.data.length > 0) {
            return alternateResult.data[0];
          } else {
            if (alternateResult.error) {
              console.error(`Alternative fetch also failed:`, 
                JSON.stringify(alternateResult.error, null, 2));
            }
            // Final fallback - retry with original method
            return fetchCardSafely(cardId, retryCount + 1);
          }
        } catch (fallbackErr) {
          console.error(`Fallback fetch method exception:`, fallbackErr);
          return null;
        }
      }
      return null;
    }
    
    if (!result.data) {
      console.error(`Card ${cardId} fetch returned no data`);
      return null;
    }
    
    return result.data;
  } catch (err) {
    console.error(`Exception fetching card ${cardId}:`, 
      err instanceof Error ? err.message : JSON.stringify(err));
    
    // If general error and haven't exceeded retry attempts, try once more
    if (retryCount < 1) {
      console.log(`Retrying after exception (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchCardSafely(cardId, retryCount + 1);
    }
    
    return null;
  }
};

// Helper function to safely fetch battle cards with proper headers
export const fetchBattleCardsSafely = async (battleId: string | undefined) => {
  if (!battleId) return [];
  
  try {
    const result = await supabase
      .from('battle_cards')
      .select('*')
      .eq('battle_id', battleId);
    
    if (result.error) {
      console.error(`Error fetching battle cards for battle ${battleId}:`, result.error);
      return [];
    }
    
    return result.data || [];
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

