import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { lobby_id } = await req.json();
    if (!lobby_id) throw new Error('Missing lobby_id.');

    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { data: lobby, error: lobbyError } = await supabaseAdmin
      .from('battle_lobbies')
      .select('*')
      .eq('id', lobby_id)
      .single();

    if (lobbyError || !lobby) throw new Error('Lobby not found.');
    if (lobby.status === 'completed' || lobby.status === 'declined') {
        return new Response(JSON.stringify({ message: 'Battle is already over.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    const isPlayer1 = lobby.player1_id === user.id;
    const isPlayer2 = lobby.player2_id === user.id;
    if (!isPlayer1 && !isPlayer2) throw new Error('You are not a player in this lobby.');

    const winner = isPlayer1 ? 'player2' : 'player1';
    let { battle_state } = lobby;
    battle_state = battle_state || {};
    battle_state.winner = winner;

    const { data: updatedLobby, error: updateError } = await supabaseAdmin
      .from('battle_lobbies')
      .update({ status: 'completed', battle_state })
      .eq('id', lobby_id)
      .select()
      .single();

    if (updateError) throw new Error('Failed to update lobby.');

    const realtimeClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const channel = realtimeClient.channel(`battle:${lobby_id}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'battle_over',
      payload: { newState: updatedLobby, reason: `${isPlayer1 ? 'Player 1' : 'Player 2'} left the battle.` },
    });

    return new Response(JSON.stringify({ success: true, message: 'You have left the battle.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
