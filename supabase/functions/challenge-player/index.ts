// deno-lint-ignore-file
// @ts-nocheck

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('Hello from challenge-player Function!')

serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { player1_id, challenged_player_id } = await req.json();
    const player2_id = challenged_player_id;
    if (!player1_id) throw new Error('Missing player1_id in request body.');
    if (!player2_id) throw new Error('Missing challenged_player_id in request body.');

    if (player1_id === player2_id) throw new Error('You cannot challenge yourself.');

    // Verify both players exist and get their usernames from profiles
    const { data: player1Data, error: player1Error } = await supabaseAdmin.auth.admin.getUserById(player1_id);
    if (player1Error || !player1Data.user) throw new Error('Challenger does not exist.');

    const { data: player2Data, error: player2Error } = await supabaseAdmin.auth.admin.getUserById(player2_id);
    if (player2Error || !player2Data.user) throw new Error('Challenged player does not exist.');

    // Get challenger's username from profiles table
    const { data: player1Profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', player1_id)
      .single();
    
    const challengerUsername = player1Profile?.username || 'Anonymous Player';

    // Create a new battle instance
    const { data: newLobby, error: createError } = await supabaseAdmin
      .from('battle_instances')
      .insert({ challenger_id: player1_id, opponent_id: player2_id, status: 'pending' })
      .select()
      .single();

    if (createError) {
      console.error('Database Insert Failed:', JSON.stringify(createError, null, 2));
      throw new Error(`Database Error: ${createError.message}`);
    }

    // Notify player 2 of the challenge
    const realtimeClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const channel = realtimeClient.channel(`invites:${player2_id}`);
    
    console.log(`Subscribing to channel: invites:${player2_id}`);
    const subscriptionResult = await channel.subscribe();
    console.log('Subscription result:', subscriptionResult);
    
    // Wait a moment for subscription to be established
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Sending challenge notification:', {
      lobby_id: newLobby.id,
      challenger_username: challengerUsername,
    });
    
    const broadcastResult = await channel.send({
      type: 'broadcast',
      event: 'challenge',
      payload: { 
        lobby_id: newLobby.id,
        challenger_username: challengerUsername,
      },
    });
    
    console.log('Broadcast result:', broadcastResult);

    return new Response(JSON.stringify({ lobbyId: newLobby.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
