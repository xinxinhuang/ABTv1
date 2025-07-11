import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Verify that the user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Update all active timers to 'completed' status
    const { data: _data, error } = await supabase
      .from('active_timers')
      .update({ status: 'completed' })
      .eq('player_id', session.user.id)
      .eq('status', 'active');
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'All active timers have been cleared'
    });
  } catch (error) {
    console.error('Error clearing timers:', error);
    return NextResponse.json(
      { error: 'Failed to clear timers' },
      { status: 500 }
    );
  }
}
