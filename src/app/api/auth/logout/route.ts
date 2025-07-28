import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });

  // Sign out the user
  await supabase.auth.signOut();

  return NextResponse.json({ message: 'Logout successful' });
}
