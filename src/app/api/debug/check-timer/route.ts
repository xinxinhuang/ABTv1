import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: Request) {
  // Initialize Supabase client with proper cookie handling for Next.js App Router
  const supabase = createRouteHandlerClient({ 
    cookies
  });
  
  // Get the timer ID from the request
  const { timerId } = await request.json();
  
  if (!timerId) {
    return NextResponse.json({ error: 'Timer ID is required' }, { status: 400 });
  }
  
  try {
    // Get authenticated user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the current user's ID
    const userId = session.user.id;
    
    // First, check if the timer exists at all
    const { data: timerData, error: timerError } = await supabase
      .from('active_timers')
      .select('*')
      .eq('id', timerId);
      
    if (timerError) {
      return NextResponse.json({ 
        error: 'Error fetching timer', 
        details: timerError.message 
      }, { status: 500 });
    }
    
    if (!timerData || timerData.length === 0) {
      return NextResponse.json({ 
        error: 'Timer not found', 
        exists: false 
      }, { status: 404 });
    }
    
    const timer = timerData[0];
    
    // Check if the timer belongs to the current user
    const belongsToUser = timer.player_id === userId;
    
    // Check RLS permissions by attempting to fetch with auth
    const { data: authCheckData, error: _authCheckError } = await supabase
      .from('active_timers')
      .select('*')
      .eq('id', timerId)
      .eq('player_id', userId);
      
    const hasPermission = authCheckData && authCheckData.length > 0;
    
    // Return detailed information about the timer
    return NextResponse.json({
      success: true,
      timer: {
        ...timer,
        // Don't expose sensitive data
        player_id: timer.player_id.substring(0, 8) + '...'
      },
      diagnostics: {
        currentUserId: userId.substring(0, 8) + '...',
        belongsToUser,
        hasPermission,
        status: timer.status,
        isReady: timer.status === 'ready',
        isActive: timer.status === 'active',
        isCompleted: timer.status === 'completed',
        startTime: timer.start_time,
        targetDelayHours: timer.target_delay_hours,
        currentTime: new Date().toISOString(),
        timePassed: new Date().getTime() - new Date(timer.start_time).getTime(),
        timeRequired: timer.target_delay_hours * 60 * 60 * 1000,
        shouldBeReady: (new Date().getTime() - new Date(timer.start_time).getTime()) >= (timer.target_delay_hours * 60 * 60 * 1000)
      }
    });
  } catch (error) {
    console.error('Error checking timer:', error);
    return NextResponse.json({ 
      error: 'Failed to check timer', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
