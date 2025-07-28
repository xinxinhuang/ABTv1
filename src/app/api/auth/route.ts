import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: Request) {
  const { username, email, password } = await request.json();

  if (!username || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  // Sign up the user
  const { data: { user }, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }

  // Add user to the profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: user.id, username });

  if (profileError) {
    // Note: In a real app, you might want to handle this more gracefully,
    // maybe by deleting the auth user if the profile creation fails.
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Add initial inventory for the new player
  const { error: inventoryError } = await supabase
    .from('player_inventory')
    .insert({ player_id: user.id, humanoid_packs: 1, weapon_packs: 1 });

  if (inventoryError) {
    return NextResponse.json({ error: inventoryError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Signup successful, please check your email to verify.' });
}
