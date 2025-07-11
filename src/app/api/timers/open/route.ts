import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateCard } from '@/lib/game/cardGeneration';
import { ActiveTimer } from '@/types/game';

// Make the handler async to properly use cookies
export async function POST(request: Request) {
  console.log('POST /api/timers/open - Starting request');
  const { timerId } = await request.json();
  
  // Initialize Supabase client with proper cookie handling for Next.js App Router
  const supabase = createRouteHandlerClient({ 
    cookies
  });
  
  // Set proper headers for the response
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401, headers }
    );
  }

  if (!timerId) {
    return NextResponse.json(
      { error: 'Timer ID is required' }, 
      { status: 400, headers }
    );
  }

  // 2. Fetch the timer to validate it and get details
  const { data, error: timerError } = await supabase
    .from('active_timers')
    .select('*')
    .eq('id', timerId)
    .eq('player_id', user.id)
    .single<ActiveTimer>();

  if (timerError || !data) {
    return NextResponse.json(
      { error: 'Timer not found or access denied.' }, 
      { status: 404, headers }
    );
  }

  // Check if timer is ready (double-checking what the DB function will do)
  const startTime = new Date(data.start_time).getTime();
  const requiredDuration = data.target_delay_hours * 60 * 60 * 1000;
  if (Date.now() - startTime < requiredDuration) {
    return NextResponse.json(
      { error: 'Timer is not yet ready.' }, 
      { status: 400, headers }
    );
  }

  // 3. Generate the card
  console.log('Generating card for pack type:', data.pack_type);
  // Calculate gold card chance: 1% at 4 hours, scaling linearly to 20% at 24 hours
  const minHours = 4;
  const maxHours = 24;
  const minChance = 1;
  const maxChance = 20;
  
  // Calculate the gold card chance based on timer duration
  const hours = Math.min(Math.max(data.target_delay_hours, minHours), maxHours);
  const goldChancePercentage = minChance + ((hours - minHours) / (maxHours - minHours)) * (maxChance - minChance);
  
  // Generate the card with the calculated gold chance
  // Create the card outside of try/catch so it's available in the whole scope
  const newCard = generateCard(data.pack_type as 'humanoid' | 'weapon', goldChancePercentage);
  console.log('Generated card:', { 
    type: newCard.card_type,
    name: newCard.card_name,
    rarity: newCard.rarity 
  });
  
  try {
    // 4. Directly handle the pack opening process without RPC (for unlimited packs)
    // First update the timer status to completed
    const { error: timerUpdateError } = await supabase
      .from('active_timers')
      .update({
        status: 'completed'
        // No completed_at field in the table schema
      })
      .eq('id', timerId)
      .eq('player_id', user.id);
      
    if (timerUpdateError) {
      console.error('Error updating timer:', timerUpdateError);
      return NextResponse.json(
        { error: 'Failed to update timer status' }, 
        { status: 500, headers }
      );
    }
    
    // Then insert the new card
    const { data: insertedCard, error: insertError } = await supabase
      .from('player_cards')
      .insert({
        player_id: user.id,
        card_type: newCard.card_type,
        card_name: newCard.card_name,
        attributes: newCard.attributes,
        rarity: newCard.rarity
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('Error inserting card:', insertError);
      return NextResponse.json(
        { error: 'Failed to create new card' }, 
        { status: 500, headers }
      );
    }
      
    // Return the new card to the client
    console.log('Successfully opened pack, returning card');
    return NextResponse.json(insertedCard, { status: 200, headers });
    
  } catch (err) {
    // Handle any other errors
    console.error('Error opening pack:', err);
    
    // Try a fallback approach - delete timer and add card directly
    console.log('Attempting fallback approach');
    try {
      const { error: timerDeleteError } = await supabase
        .from('active_timers')
        .update({ status: 'completed' })
        .eq('id', timerId)
        .eq('player_id', user.id);
      
      if (timerDeleteError) {
        return NextResponse.json(
          { error: 'Failed to complete timer.' },
          { status: 500, headers }
        );
      }
      
      // Insert the card directly
      const { data: insertedCard, error: insertError } = await supabase
        .from('player_cards')
        .insert({
          player_id: user.id,
          card_type: newCard.card_type,
          card_name: newCard.card_name,
          attributes: newCard.attributes,
          rarity: newCard.rarity
        })
        .select()
        .single();
      
      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to create card.' },
          { status: 500, headers }
        );
      }
      
      console.log('Fallback successful, returning card');
      return NextResponse.json(insertedCard, { status: 200, headers });
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      // Log more details about the error
      if (fallbackError instanceof Error) {
        console.error('Error details:', fallbackError.message);
        console.error('Stack trace:', fallbackError.stack);
      }
      
      return NextResponse.json(
        { error: 'Failed to open pack after multiple attempts.' },
        { status: 500, headers }
      );
    }
  }

  // This code path should never be reached as all returns are handled in the try/catch block above
  return NextResponse.json(
    { error: 'Unexpected execution path' },
    { status: 500, headers }
  );
}
