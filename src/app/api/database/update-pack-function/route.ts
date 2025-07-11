import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// This endpoint will update the open_pack_and_get_card function to support unlimited packs
export async function POST() {
  // Initialize Supabase client with proper cookie handling for Next.js App Router
  const supabase = createRouteHandlerClient({ 
    cookies
  });
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }

  try {
    // Use RPC to drop the old function if it exists
    await supabase.rpc('drop_function_if_exists', {
      function_name: 'open_pack_and_get_card'
    }).single();

    // Create a new version of the function without inventory checks
    const { data: _data, error } = await supabase.sql(`
      CREATE OR REPLACE FUNCTION public.open_pack_and_get_card(
        p_player_id UUID,
        p_timer_id UUID,
        p_card_type TEXT,
        p_card_name TEXT,
        p_attributes JSONB,
        p_rarity TEXT
      ) 
      RETURNS TABLE (
        id UUID,
        player_id UUID,
        card_type TEXT,
        card_name TEXT,
        attributes JSONB,
        rarity TEXT,
        created_at TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        v_timer RECORD;
        v_card_id UUID;
      BEGIN
        -- Check if the timer exists and belongs to the player
        SELECT * INTO v_timer 
        FROM public.active_timers 
        WHERE id = p_timer_id AND player_id = p_player_id AND status = 'active';
        
        IF v_timer.id IS NULL THEN
          RAISE EXCEPTION 'Timer not found or not ready';
        END IF;
        
        -- Verify timer is ready
        IF (EXTRACT(EPOCH FROM (NOW() - v_timer.start_time)) / 3600) < v_timer.target_delay_hours THEN
          RAISE EXCEPTION 'Timer is not yet ready';
        END IF;
        
        -- Update timer status to completed
        UPDATE public.active_timers 
        SET status = 'completed', 
            completed_at = NOW()
        WHERE id = p_timer_id;
        
        -- Insert the new card
        INSERT INTO public.player_cards (player_id, card_type, card_name, attributes, rarity)
        VALUES (p_player_id, p_card_type, p_card_name, p_attributes, p_rarity)
        RETURNING id INTO v_card_id;
        
        -- Return the newly created card
        RETURN QUERY
        SELECT * FROM public.player_cards WHERE id = v_card_id;
      END;
      $$;
    `);

    if (error) {
      console.error('Error updating function:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    // Also add a helper function to drop functions if needed
    await supabase.sql(`
      CREATE OR REPLACE FUNCTION public.drop_function_if_exists(function_name TEXT)
      RETURNS void
      LANGUAGE plpgsql
      AS $$
      BEGIN
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || function_name || '(uuid, uuid, text, text, jsonb, text)';
      EXCEPTION
        WHEN OTHERS THEN
          -- Function doesn't exist or other error, just continue
      END;
      $$;
    `);

    return NextResponse.json({ 
      success: true,
      message: 'Successfully updated database function to support unlimited packs'
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
