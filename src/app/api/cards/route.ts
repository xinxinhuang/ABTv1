import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: cards, error } = await supabase
    .from('player_cards')
    .select('*')
    .eq('player_id', user.id)
    .order('obtained_at', { ascending: false });

  if (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json({ error: 'Failed to fetch cards.' }, { status: 500 });
  }

  return NextResponse.json(cards);
}

export async function DELETE(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get the email from the request URL or body
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  
  // If no email is provided, delete the current user's cards
  if (!email) {
    const { error } = await supabase
      .from('player_cards')
      .delete()
      .eq('player_id', user.id);
    
    if (error) {
      console.error('Error deleting cards:', error);
      return NextResponse.json({ error: 'Failed to delete cards.' }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'All cards deleted successfully for current user.' });
  }
  
  // If email is provided, first get the user ID for that email
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();
  
  if (userError || !userData) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }
  
  // Delete all cards for the specified user
  const { error } = await supabase
    .from('player_cards')
    .delete()
    .eq('player_id', userData.id);
  
  if (error) {
    console.error('Error deleting cards:', error);
    return NextResponse.json({ error: 'Failed to delete cards.' }, { status: 500 });
  }
  
  return NextResponse.json({ message: `All cards deleted successfully for user ${email}.` });
}
