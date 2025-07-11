import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get the user ID from the request URL
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  // If no userId is provided, use a hardcoded ID for hxxistc@hotmail.com
  // This is a simplified approach for this specific task
  const targetUserId = userId || user.id;
  
  // Delete all cards for the specified user
  const { error } = await supabase
    .from('player_cards')
    .delete()
    .eq('player_id', targetUserId);
  
  if (error) {
    console.error('Error deleting cards:', error);
    return NextResponse.json({ error: 'Failed to delete cards.' }, { status: 500 });
  }
  
  return NextResponse.json({ 
    message: `All cards deleted successfully for user ID: ${targetUserId}.`,
    userId: targetUserId
  });
}
