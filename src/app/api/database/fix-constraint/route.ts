import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Initialize Supabase client with proper cookie handling for Next.js App Router
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    });

    // First check what the current constraint is
    const { data: constraintInfo, error: constraintCheckError } = await supabase.rpc(
      'exec',
      {
        query: `
          SELECT c.conname, pg_get_constraintdef(c.oid)
          FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          JOIN pg_namespace n ON t.relnamespace = n.oid
          WHERE t.relname = 'player_cards'
          AND n.nspname = 'public'
          AND c.conname = 'player_cards_rarity_check';
        `
      }
    );

    console.log('Current constraint info:', constraintInfo);

    // Drop the existing constraint and add the new one
    const { error: updateError } = await supabase.rpc(
      'exec',
      {
        query: `
          -- Drop the existing constraint if it exists
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM pg_constraint c
              JOIN pg_class t ON c.conrelid = t.oid
              JOIN pg_namespace n ON t.relnamespace = n.oid
              WHERE t.relname = 'player_cards'
              AND n.nspname = 'public'
              AND c.conname = 'player_cards_rarity_check'
            ) THEN
              ALTER TABLE public.player_cards DROP CONSTRAINT IF EXISTS player_cards_rarity_check;
            END IF;
          END
          $$;

          -- Add the new constraint that accepts bronze, silver, and gold
          ALTER TABLE public.player_cards 
          ADD CONSTRAINT player_cards_rarity_check 
          CHECK (rarity IN ('bronze', 'silver', 'gold'));
        `
      }
    );

    if (updateError) {
      console.error('Error updating constraint:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update constraint',
        details: updateError
      }, { status: 500 });
    }

    // Return success
    return NextResponse.json({ 
      success: true,
      message: 'Database constraint updated successfully for new rarity values'
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
