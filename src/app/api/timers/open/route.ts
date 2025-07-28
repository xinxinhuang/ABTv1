import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

import { 
  withErrorHandler, 
  AuthError, 
  NotFoundError,
  ValidationError,
  validateRequired,
  requireUser,
  checkRateLimit
} from '@/lib/utils/errorHandler';
import { ActiveTimer } from '@/types/game';
import { generateCard } from '@/lib/game/cardGeneration';

async function openPackHandler(request: Request) {
  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  checkRateLimit(clientIp, 5, 60000); // 5 requests per minute for pack opening

  // Parse request body
  const body = await request.json();
  const { timerId } = body;

  // Validate required fields
  validateRequired(timerId, 'timerId');

  // Initialize Supabase client
  const supabase = createRouteHandlerClient({ 
    cookies
  });

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    throw new AuthError('Authentication failed');
  }
  
  requireUser(user);

  // Fetch the timer to validate it and get details
  const { data: timerData, error: timerError } = await supabase
    .from('active_timers')
    .select('*')
    .eq('id', timerId)
    .eq('player_id', user!.id)
    .single<ActiveTimer>();

  if (timerError || !timerData) {
    throw new NotFoundError('Timer not found or access denied');
  }

  // Check if timer is ready
  const startTime = new Date(timerData.start_time).getTime();
  const requiredDuration = timerData.target_delay_hours * 60 * 60 * 1000;
  const now = Date.now();
  
  if (now - startTime < requiredDuration) {
    const remainingTime = Math.ceil((requiredDuration - (now - startTime)) / 1000 / 60);
    throw new ValidationError(`Timer is not yet ready. ${remainingTime} minutes remaining.`);
  }

  // Generate the card
  console.log('Generating card for pack type:', timerData.pack_type);
  const newCard = generateCard(timerData.pack_type as 'humanoid' | 'weapon', 0);

  // Start transaction to add card and update timer
  const { data: insertedCard, error: insertError } = await supabase
    .from('player_cards')
    .insert({
      player_id: user!.id,
      card_type: newCard.card_type,
      card_name: newCard.card_name,
      attributes: newCard.attributes,
      rarity: newCard.rarity,
    })
    .select()
    .single();

  if (insertError) {
    throw insertError; // Will be handled by the error handler
  }

  // Update timer status to completed
  const { error: updateError } = await supabase
    .from('active_timers')
    .update({ status: 'completed' })
    .eq('id', timerId)
    .eq('player_id', user!.id);

  if (updateError) {
    // If timer update fails, we could consider this non-critical
    console.warn('Failed to update timer status:', updateError);
  }

  // Return the generated card
  return NextResponse.json({
    success: true,
    message: 'Pack opened successfully!',
    card: insertedCard,
    packType: timerData.pack_type,
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Export the handler wrapped with error handling
export const POST = withErrorHandler(openPackHandler);
