import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

import { 
  withErrorHandler, 
  AuthError, 
  NotFoundError,
  ValidationError,
  validateRequired,
  requireUser
} from '@/lib/utils/errorHandler';

async function completeTimerHandler(request: Request) {
  // Parse request body
  const body = await request.json();
  const { timerId, action } = body;

  // Validate required fields
  validateRequired(timerId, 'timerId');
  validateRequired(action, 'action');

  if (!['open', 'save'].includes(action)) {
    throw new ValidationError('Action must be either "open" or "save"');
  }

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
    .single();

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

  // Check if timer is already completed
  if (timerData.is_completed) {
    throw new ValidationError('Timer has already been completed');
  }

  // Update timer based on action
  const updates = {
    is_completed: true,
    is_saved: action === 'save',
    is_active: false
  };

  const { error: updateError } = await supabase
    .from('active_timers')
    .update(updates)
    .eq('id', timerId)
    .eq('player_id', user!.id);

  if (updateError) {
    throw updateError;
  }

  // If action is 'open', activate next timer in queue (but don't auto-start)
  if (action === 'open') {
    // Find next timer in queue for the same category
    const { data: nextTimer } = await supabase
      .from('active_timers')
      .select('id')
      .eq('player_id', user!.id)
      .eq('pack_type', timerData.pack_type)
      .eq('is_active', false)
      .eq('is_completed', false)
      .order('queue_position', { ascending: true })
      .limit(1)
      .single();

    if (nextTimer) {
      // Update queue positions and activate next timer
      await supabase
        .from('active_timers')
        .update({ 
          is_active: true, 
          queue_position: 0,
          start_time: new Date().toISOString() 
        })
        .eq('id', nextTimer.id);

      // Update remaining queue positions
      await supabase
        .from('active_timers')
        .update({ queue_position: supabase.sql`queue_position - 1` })
        .eq('player_id', user!.id)
        .eq('pack_type', timerData.pack_type)
        .eq('is_active', false)
        .eq('is_completed', false);
    }
  }

  return NextResponse.json({
    success: true,
    message: action === 'open' ? 'Timer completed and pack opened' : 'Timer saved for later',
    timerId,
    action,
    packType: timerData.pack_type
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Export the handler wrapped with error handling
export const POST = withErrorHandler(completeTimerHandler);