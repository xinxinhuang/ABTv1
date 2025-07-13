// deno-lint-ignore-file
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for browser compatibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const { data: lobby, error: lobbyError } = await supabaseAdmin.from('battle_instances').select('*').eq('id', lobby_id).single();
    if (lobbyError || !lobby) throw new Error('Battle instance not found.');
    if (lobby.opponent_id !== user.id) throw new Error('You are not the challenged player.');
    if (lobby.status !== 'pending') throw new Error('This challenge is no longer pending.');

    const { data: updatedLobby, error: updateError } = await supabaseAdmin
      .from('battle_instances')
      .update({ status: 'active' })
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
