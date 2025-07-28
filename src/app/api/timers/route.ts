import type { Database } from '@/types/database';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

import { 
  withErrorHandler, 
  AuthError, 
  ValidationError,
  validateRequired,
  validatePackType,
  validateNumberRange,
  requireAuth,
  checkRateLimit
} from '@/lib/utils/errorHandler';

async function timerHandler(request: Request) {
  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  checkRateLimit(clientIp, 10, 60000); // 10 requests per minute

  // Parse request body
  const body = await request.json();
  const { packType, delayHours, startTime } = body;

  // Validate required fields
  validateRequired(packType, 'packType');
  validateRequired(delayHours, 'delayHours');

  // Validate pack type
  validatePackType(packType);

  // Validate delay hours
  validateNumberRange(delayHours, 4, 24, 'delayHours');

  // Create Supabase client
  const supabase = createRouteHandlerClient<Database>({
    cookies
  });

  // Check for authentication via cookies first
  const { data: { session: cookieSession } } = await supabase.auth.getSession();

  // Check for authentication via Authorization header if cookie session not available
  let session = cookieSession;
  if (!session) {
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          session = { 
            user, 
            access_token: token,
            refresh_token: '',
            expires_in: 3600,
            token_type: 'bearer' 
          };
        }
      }
    }
  }

  // Require authentication
  requireAuth(session);

  // Debug log (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting timer:', { 
      userId: session!.user.id, 
      packType, 
      delayHours 
    });
  }

  // Create an admin client for database operations
  const adminSupabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Ensure user has a profiles record
  const { error: profileError } = await adminSupabase
    .from('profiles')
    .select('id')
    .eq('id', session!.user.id)
    .single();

  if (profileError) {
    // Create profile if it doesn't exist
    const { error: createProfileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: session!.user.id,
        username: session!.user.email?.split('@')[0] || 'user',
        display_name: session!.user.user_metadata?.username || null,
        avatar_url: null,
      });

    if (createProfileError) {
      throw new ValidationError('Failed to create user profile');
    }
  }

  // Calculate end time
  const startTimeDate = startTime ? new Date(startTime) : new Date();
  const endTime = new Date(startTimeDate.getTime() + delayHours * 60 * 60 * 1000);

  // Check current active and queued timers for this category
  const { data: existingTimers } = await adminSupabase
    .from('active_timers')
    .select('id, is_active, queue_position')
    .eq('player_id', session!.user.id)
    .eq('pack_type', packType)
    .eq('is_completed', false);

  const activeCount = existingTimers?.filter(t => t.is_active).length || 0;
  const queueCount = existingTimers?.filter(t => !t.is_active).length || 0;

  // Enforce limits: 1 active max, 5 total (active + queue)
  if (activeCount >= 1) {
    throw new ValidationError(`An active timer already exists for ${packType} packs. Please wait for it to complete.`);
  }

  if ((activeCount + queueCount) >= 5) {
    throw new ValidationError(`Maximum queue limit reached. You can only queue up to 5 ${packType} boosters at a time.`);
  }

  // Calculate queue position (0 for active, 1+ for queued)
  const queuePosition = activeCount === 0 ? 0 : queueCount + 1;

  // Create timer record
  const { data: timerData, error: timerError } = await adminSupabase
    .from('active_timers')
    .insert({
      player_id: session!.user.id,
      pack_type: packType,
      start_time: startTimeDate.toISOString(),
      target_delay_hours: delayHours,
      queue_position: queuePosition,
      is_active: queuePosition === 0,
      is_completed: false,
      is_saved: false,
    })
    .select()
    .single();

  if (timerError) {
    throw timerError; // Will be handled by the error handler
  }

  // Return success response with queue information
  return NextResponse.json({
    success: true,
    message: queuePosition === 0 
      ? `Timer started for ${packType} pack`
      : `Added to ${packType} queue (position ${queuePosition})`,
    timerId: timerData.id,
    endsAt: endTime.toISOString(),
    delayHours: delayHours,
    queuePosition: queuePosition,
    isActive: queuePosition === 0,
  }, {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

async function getTimersHandler(request: Request) {
  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  checkRateLimit(clientIp, 20, 60000); // 20 requests per minute

  // Create Supabase client
  const supabase = createRouteHandlerClient<Database>({
    cookies
  });

  // Check for authentication via cookies first
  const { data: { session: cookieSession } } = await supabase.auth.getSession();

  // Check for authentication via Authorization header if cookie session not available
  let session = cookieSession;
  if (!session) {
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          session = { 
            user, 
            access_token: token,
            refresh_token: '',
            expires_in: 3600,
            token_type: 'bearer' 
          };
        }
      }
    }
  }

  // Require authentication
  requireAuth(session);

  // Create an admin client for database operations
  const adminSupabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Fetch active timers for the authenticated user
  const { data: activeTimers, error: timersError } = await adminSupabase
    .from('active_timers')
    .select(`
      id,
      pack_type,
      start_time,
      target_delay_hours,
      queue_position,
      is_active,
      is_completed,
      is_saved
    `)
    .eq('player_id', session!.user.id)
    .eq('is_completed', false)
    .order('queue_position', { ascending: true });

  if (timersError) {
    throw timersError;
  }

  // Get queue counts per category
  const { data: queueStats, error: statsError } = await adminSupabase
    .from('active_timers')
    .select(`
      pack_type,
      is_active,
      queue_position
    `)
    .eq('player_id', session!.user.id)
    .eq('is_completed', false);

  if (statsError) {
    throw statsError;
  }

  // Calculate queue information per category
  const categoryStats: Record<string, {
    activeCount: number;
    queueCount: number;
    totalCount: number;
    activeTimer?: any;
    queuedTimers: any[];
  }> = {};

  const packTypes = ['humanoid', 'weapon'];
  
  // Initialize categories
  packTypes.forEach(type => {
    categoryStats[type] = {
      activeCount: 0,
      queueCount: 0,
      totalCount: 0,
      queuedTimers: []
    };
  });

  // Calculate stats from query results
  if (queueStats) {
    queueStats.forEach(timer => {
      const type = timer.pack_type;
      if (!categoryStats[type]) {
        categoryStats[type] = {
          activeCount: 0,
          queueCount: 0,
          totalCount: 0,
          queuedTimers: []
        };
      }
      
      categoryStats[type].totalCount++;
      
      if (timer.is_active) {
        categoryStats[type].activeCount++;
      } else {
        categoryStats[type].queueCount++;
      }
    });
  }

  // Separate active and queued timers
  const activeTimersList = activeTimers?.filter(t => t.is_active) || [];
  const queuedTimersList = activeTimers?.filter(t => !t.is_active) || [];

  // Add timers to their respective categories
  activeTimers?.forEach(timer => {
    const type = timer.pack_type;
    if (categoryStats[type]) {
      if (timer.is_active) {
        categoryStats[type].activeTimer = timer;
      } else {
        categoryStats[type].queuedTimers.push(timer);
      }
    }
  });

  // Calculate remaining time for active timers
  const now = new Date();
  const timersWithRemaining = activeTimersList.map(timer => {
    const startTime = new Date(timer.start_time);
    const endTime = new Date(startTime.getTime() + timer.target_delay_hours * 60 * 60 * 1000);
    const remainingMs = Math.max(0, endTime.getTime() - now.getTime());
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      ...timer,
      ends_at: endTime.toISOString(),
      remaining_hours: remainingHours,
      remaining_minutes: remainingMinutes,
      is_ready: remainingMs <= 0
    };
  });

  // Format queued timers with position information
  const queuedWithPosition = queuedTimersList.map(timer => ({
    ...timer,
    queue_position: timer.queue_position,
    estimated_start_time: calculateEstimatedStartTime(timer, activeTimersList)
  }));

  return NextResponse.json({
    success: true,
    data: {
      activeTimers: timersWithRemaining,
      queuedTimers: queuedWithPosition,
      categoryStats,
      summary: {
        totalActive: activeTimersList.length,
        totalQueued: queuedTimersList.length,
        totalTimers: (activeTimers?.length || 0)
      }
    }
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Helper function to calculate estimated start time for queued timers
function calculateEstimatedStartTime(timer: any, allTimers: any[]): string | null {
  const categoryTimers = allTimers.filter(t => t.pack_type === timer.pack_type);
  const activeTimer = categoryTimers.find(t => t.is_active);
  
  if (!activeTimer) return null;
  
  const activeEndTime = new Date(activeTimer.start_time).getTime() + activeTimer.target_delay_hours * 60 * 60 * 1000;
  const estimatedStart = new Date(activeEndTime + (timer.queue_position - 1) * 4 * 60 * 60 * 1000); // Assuming 4 hours per timer
  
  return estimatedStart.toISOString();
}

// Export the handlers wrapped with error handling
export const POST = withErrorHandler(timerHandler);
export const GET = withErrorHandler(getTimersHandler);
