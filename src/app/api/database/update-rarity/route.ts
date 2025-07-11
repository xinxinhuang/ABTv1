import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Initialize Supabase client with proper cookie handling for Next.js App Router
    const supabase = createRouteHandlerClient({ 
      cookies
    });

    // 1. Update the rarity column type to accept the new values
    // First, we need to alter the existing type if it's an enum
    const { data: _typeCheck, error: typeCheckError } = await supabase.rpc(
      'exec',
      {
        query: `
          DO $$
          BEGIN
            -- Check if the type exists, if it does, drop it
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_rarity') THEN
              DROP TYPE card_rarity CASCADE;
            END IF;
            
            -- Create the new type with updated values
            CREATE TYPE card_rarity AS ENUM ('bronze', 'silver', 'gold');
            
            -- Try to alter column if it has a type constraint
            BEGIN
              ALTER TABLE player_cards 
                ALTER COLUMN rarity TYPE card_rarity 
                USING rarity::text::card_rarity;
            EXCEPTION WHEN OTHERS THEN
              -- If that fails, try a different approach
              ALTER TABLE player_cards 
                ALTER COLUMN rarity TYPE TEXT;
            END;
          END $$;
        `
      }
    );

    if (typeCheckError) {
      console.error('Error updating rarity type:', typeCheckError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update rarity type',
        details: typeCheckError
      }, { status: 500 });
    }

    // 2. Update existing card values - map old to new
    const { data: _updateResult, error: updateError } = await supabase.rpc(
      'exec',
      {
        query: `
          UPDATE player_cards
          SET rarity = CASE
            WHEN rarity = 'grey' THEN 'bronze'
            WHEN rarity = 'blue' THEN 'silver'
            WHEN rarity = 'gold' THEN 'gold'
            ELSE 'bronze' -- Default fallback
          END;
        `
      }
    );

    if (updateError) {
      console.error('Error updating existing cards:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update existing cards',
        details: updateError
      }, { status: 500 });
    }

    // Return success
    return NextResponse.json({ 
      success: true,
      message: 'Database updated successfully for new rarity values'
    });
    
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'An unexpected error occurred',
      details: err
    }, { status: 500 });
  }
}
