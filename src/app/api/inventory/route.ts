import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: playerCards, error } = await supabase
      .from('player_cards')
      .select('*')
      .eq('player_id', user.id);

    if (error) {
      console.error('Error fetching inventory:', error);
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch inventory' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new NextResponse(JSON.stringify(playerCards), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return new NextResponse(JSON.stringify({ error: 'An internal server error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
