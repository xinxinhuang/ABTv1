import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!serviceRoleKey 
      });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Create service role client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check if profile already exists
    console.log(`Checking if profile exists for user: ${user.id}`);
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no record exists

    if (checkError) {
      console.error('Error checking existing profile:', checkError);
      return NextResponse.json({ 
        error: 'Failed to check existing profile',
        details: checkError.message 
      }, { status: 500 });
    }

    if (existingProfile) {
      console.log('Profile already exists:', existingProfile);
      return NextResponse.json({ 
        message: 'Profile already exists',
        profile: existingProfile 
      }, { status: 200 });
    }

    console.log('No existing profile found, proceeding with creation');

    // Use email as username (more reliable than user_metadata)
    const baseUsername = user.email || 'anonymous';
    let attempts = 0;
    let newProfile = null;
    
    while (attempts < 5) {
      const finalUsername = attempts === 0 ? baseUsername : `${baseUsername}_${Date.now()}`;
      
      console.log(`Attempting to create profile for user ${user.id} with username: ${finalUsername}`);
      
      const { data, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          username: finalUsername,
          display_name: user.email || finalUsername
        })
        .select()
        .single();

      if (!profileError) {
        newProfile = data;
        console.log('Profile created successfully:', newProfile);
        break;
      }

      console.error(`Profile creation attempt ${attempts + 1} failed:`, profileError);

      // If it's a unique constraint violation on the primary key (user ID), the profile already exists
      if (profileError.code === '23505' && profileError.details?.includes('Key (id)=')) {
        console.log('Profile already exists (detected via constraint error), fetching existing profile');
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        return NextResponse.json({ 
          message: 'Profile already exists',
          profile: existingProfile 
        }, { status: 200 });
      }

      // If it's a unique constraint violation on username, try with a different username
      if (profileError.code === '23505' && profileError.details?.includes('Key (username)=')) {
        attempts++;
        continue;
      }

      // For other errors, log and return
      return NextResponse.json({ 
        error: 'Failed to create profile',
        details: profileError.message,
        code: profileError.code
      }, { status: 500 });
    }

    if (!newProfile) {
      return NextResponse.json({ 
        error: 'Failed to create profile after multiple attempts' 
      }, { status: 500 });
    }

    // Create initial inventory
    console.log('Creating initial inventory for user:', user.id);
    const { error: inventoryError } = await supabaseAdmin
      .from('player_inventory')
      .insert({
        player_id: user.id,
        humanoid_packs: 1,
        weapon_packs: 0
      });

    if (inventoryError) {
      console.error('Error creating inventory:', inventoryError);
      // Don't fail the request if inventory creation fails, but log it
    } else {
      console.log('Initial inventory created successfully');
    }

    return NextResponse.json({ 
      message: 'Profile created successfully',
      profile: newProfile 
    });

  } catch (error) {
    console.error('Unexpected error in create-profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}