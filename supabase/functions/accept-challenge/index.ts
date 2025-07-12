import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { lobby_id } = await req.json();
    if (!lobby_id) throw new Error('Missing lobby_id in request body.');

    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const { data: lobby, error: lobbyError } = await supabaseAdmin.from('battle_lobbies').select('*').eq('id', lobby_id).single();
    if (lobbyError || !lobby) throw new Error('Lobby not found.');
    if (lobby.player2_id !== user.id) throw new Error('You are not the challenged player.');
    if (lobby.status !== 'pending') throw new Error('This challenge is no longer pending.');

    const { data: updatedLobby, error: updateError } = await supabaseAdmin
      .from('battle_lobbies')
      .update({ status: 'card_selection' })
      .eq('id', lobby_id)
      .select()
      .single();

    if (updateError) throw new Error('Failed to update lobby status.');

    const realtimeClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const channel = realtimeClient.channel(`battle:${lobby_id}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'challenge_accepted',
      payload: { newState: updatedLobby },
    });

    return new Response(JSON.stringify({ success: true, lobby: updatedLobby }), {
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
