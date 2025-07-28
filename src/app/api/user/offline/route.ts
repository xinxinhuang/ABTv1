import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Remove user from online_players table
    const { error } = await supabase
      .from('online_players')
      .delete()
      .eq('id', user_id);

    if (error) {
      console.error('Error removing user from online_players:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in offline API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 