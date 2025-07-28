import type { Database } from '@/types/database';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: Request) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });
  
  try {
    // Create a Supabase client with the Auth context of the function
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({
      cookies: () => cookieStore
    });
    
    // Check for authentication via cookies first
    const { data: { session: cookieSession } } = await supabase.auth.getSession();
    
    // Check for authentication via Authorization header if cookie session not available
    let session = cookieSession;
    
    if (!session) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        // Token extraction commented out as it's not currently used
        // const token = authHeader.substring(7);
        // Verify user is authenticated
        const { data: { session: tokenSession } } = await supabase.auth.getSession();
        if (!tokenSession) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
        }
        session = tokenSession;
      }
    }
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401, headers }
      );
    }
    
    // Parse request body
    const { timerId, hoursToSubtract } = await request.json();
    
    // Validate required fields
    if (!timerId) {
      return NextResponse.json(
        { error: 'Timer ID is required.' },
        { status: 400, headers }
      );
    }
    
    if (!hoursToSubtract || hoursToSubtract < 0) {
      return NextResponse.json(
        { error: 'Hours to subtract must be a positive number.' },
        { status: 400, headers }
      );
    }
    
    // Get the timer
    const { data: timer, error: timerError } = await supabase
      .from('active_timers')
      .select('*')
      .eq('id', timerId)
      .single();
    
    if (timerError) {
      return NextResponse.json(
        { error: 'Timer not found.' },
        { status: 404, headers }
      );
    }
    
    // Check if the user owns this timer
    if (timer.player_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only modify your own timers.' },
        { status: 403, headers }
      );
    }
    
    // Calculate new start time (subtract hours from current time)
    const currentStartTime = new Date(timer.start_time);
    currentStartTime.setHours(currentStartTime.getHours() - hoursToSubtract);
    const newStartTime = currentStartTime.toISOString();
    
    // Update the timer with the new start time
    const { data: updatedTimer, error: updateError } = await supabase
      .from('active_timers')
      .update({ start_time: newStartTime })
      .eq('id', timerId)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update timer.', details: updateError.message },
        { status: 500, headers }
      );
    }
    
    return NextResponse.json(updatedTimer, { status: 200, headers });
    
  } catch (error) {
    console.error('Error in fast-forward-timer:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500, headers }
    );
  }
}
