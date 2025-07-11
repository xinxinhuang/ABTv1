import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';


export async function POST(request: Request) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });
  
  try {
    // Create a Supabase client with the Auth context of the function
    // Using the recommended approach for Next.js App Router
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
            // We have a valid user from the token
            // Create a simplified session object with the necessary properties
            session = { 
              user, 
              access_token: token,
              refresh_token: '', // Add required Session properties
              expires_in: 3600,
              token_type: 'bearer' 
            };
          }
        }
      }
    }
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers }
      );
    }

    const { packType, delayHours, startTime } = await request.json() as { 
      packType: 'humanoid' | 'weapon';
      delayHours: number;
      startTime?: string; // Optional start time
    };
    
    // Validate input
    if (!['humanoid', 'weapon'].includes(packType)) {
      return NextResponse.json(
        { error: 'Invalid pack type' }, 
        { status: 400, headers }
      );
    }
    
    // Ensure delayHours meets the database constraint (4-24 hours)
    if (delayHours < 4 || delayHours > 24) {
      return NextResponse.json(
        { error: 'Invalid delay hours. Must be between 4 and 24 hours.' }, 
        { status: 400, headers }
      );
    }
    
    // Debug log (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Starting timer:', { 
        userId: session.user.id, 
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

    // First check if there's a profiles record for this user
    // This is needed because player_inventory has a foreign key to profiles
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .single();

    // If profile doesn't exist, create it first
    if (profileError && profileError.code === 'PGRST116') {
      const { error: createProfileError } = await adminSupabase
        .from('profiles')
        .insert({
          id: session.user.id,
          username: `user_${Date.now()}`, // Generate a temporary username
          display_name: `User ${Date.now().toString().slice(-4)}` // Simple display name
        });

      if (createProfileError) {
        console.error('Error creating profile:', createProfileError);
        return NextResponse.json(
          { error: 'Failed to create user profile.', details: createProfileError.message },
          { status: 500, headers }
        );
      }
    } else if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to access user profile.', details: profileError.message },
        { status: 500, headers }
      );
    }

    // Now get or create inventory for the user
    // Using 'let' for inventory as it may be reassigned if we need to create a new inventory
    const result = await adminSupabase
      .from('player_inventory')
      .select('*')
      .eq('player_id', session.user.id)
      .single();
    
    let _inventory = result.data;
    const inventoryError = result.error;

    // If inventory doesn't exist, create it
    if (inventoryError) {
      if (inventoryError.code === 'PGRST116') { // 'PGRST116' means no rows found
        const { data: newInventory, error: createError } = await adminSupabase
          .from('player_inventory')
          .insert({
            player_id: session.user.id,
            humanoid_packs: 1, // Default starting packs
            weapon_packs: 1,   // Default starting packs
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating inventory:', createError);
          return NextResponse.json(
            { error: 'Failed to create inventory.', details: createError.message },
            { status: 500, headers }
          );
        }
        _inventory = newInventory;
      } else {
        // Handle other potential errors
        console.error('Error fetching inventory:', inventoryError);
        return NextResponse.json(
          { error: 'Failed to access inventory.', details: inventoryError.message },
          { status: 500, headers }
        );
      }
    }

    // Unlimited packs - no need to check or update inventory
    
    // Create the timer based on the schema in documentation
    // Using start_time and target_delay_hours instead of an end_time column
    const timerData = {
      player_id: session.user.id,
      pack_type: packType,
      start_time: startTime || new Date().toISOString(), // Use provided start time or current time
      target_delay_hours: delayHours, // Must be 4 or greater according to DB constraint
      status: 'active'
    };
    
    const { data: timer, error: timerError } = await adminSupabase
      .from('active_timers')
      .insert(timerData)
      .select()
      .single();

    if (timerError) {
      console.error('Error in create timer:', timerError);
      return NextResponse.json(
        { 
          error: 'Failed to create timer and update inventory.',
          details: timerError.message 
        }, 
        { status: 500, headers }
      );
    }

    return NextResponse.json({ 
      message: 'Timer started successfully!',
      timerId: timer?.id || 'unknown'
    }, { 
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Unexpected error in timers route:', error);
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers }
    );
  }
}
