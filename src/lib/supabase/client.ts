import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';

// Configure Supabase client with appropriate headers to avoid 406 errors
export const supabase = createClientComponentClient<Database>({
  options: {
    global: {
      headers: {
        'Accept': '*/*',  // Accept any content type to avoid 406 errors
        'Content-Type': 'application/json'
      }
    }
  }
});

// Helper function to safely fetch card data with error handling
export const fetchCardSafely = async (cardId: string | undefined) => {
  if (!cardId) return null;
  
  try {
    // Use a direct approach to avoid TypeScript issues
    const result = await supabase
      .from('player_cards')
      .select()
      .eq('id', cardId)
      .maybeSingle();
    
    if (result.error) {
      console.error(`Error fetching card ${cardId}:`, result.error);
      return null;
    }
    
    return result.data;
  } catch (err) {
    console.error(`Exception fetching card ${cardId}:`, err);
    return null;
  }
};

