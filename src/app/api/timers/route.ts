import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
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

  // Create timer record
  const { data: timerData, error: timerError } = await adminSupabase
    .from('active_timers')
    .insert({
      player_id: session!.user.id,
      pack_type: packType,
      start_time: startTimeDate.toISOString(),
      target_delay_hours: delayHours,
      status: 'active',
      ends_at: endTime.toISOString(),
    })
    .select()
    .single();

  if (timerError) {
    throw timerError; // Will be handled by the error handler
  }

  // Return success response
  return NextResponse.json({
    success: true,
    message: `Timer started for ${packType} pack`,
    timerId: timerData.id,
    endsAt: endTime.toISOString(),
    delayHours: delayHours,
  }, {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Export the handler wrapped with error handling
export const POST = withErrorHandler(timerHandler);
