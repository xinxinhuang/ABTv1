// deno-lint-ignore-file
// @ts-nocheck

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { lobby_id, response, user_id } = await req.json();
    if (!lobby_id || !response) throw new Error('Missing lobby_id or response in request body.');

    // 1. Fetch the lobby
    const { data: lobby, error: lobbyError } = await supabaseAdmin
      .from('battle_lobbies')
      .select('id, player1_id, player2_id, status')
      .eq('id', lobby_id)
      .single();

    if (lobbyError || !lobby) throw new Error('Lobby not found.');

    // 2. Security Check: Ensure the user responding is player2
    if (lobby.player2_id !== user_id) {
      throw new Error('You are not authorized to respond to this challenge.');
    }

    if (lobby.status !== 'pending') {
      throw new Error('This challenge has already been responded to.');
    }

    const realtimeClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const challengerChannel = realtimeClient.channel(`users:${lobby.player1_id}`);
    await challengerChannel.subscribe();

    if (response === 'accepted') {
      // 3a. Update lobby status to 'active'
      const { error: updateError } = await supabaseAdmin
        .from('battle_lobbies')
        .update({ status: 'active' })
        .eq('id', lobby_id);

      if (updateError) throw new Error('Failed to accept challenge.');

      // 4a. Notify challenger that the challenge was accepted
      await challengerChannel.send({
        type: 'broadcast',
        event: 'challenge_accepted',
        payload: { lobbyId: lobby.id },
      });

      return new Response(JSON.stringify({ message: 'Challenge accepted.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else if (response === 'declined') {
      // 3b. Delete the lobby
      const { error: deleteError } = await supabaseAdmin
        .from('battle_lobbies')
        .delete()
        .eq('id', lobby_id);

      if (deleteError) throw new Error('Failed to decline challenge.');

      // 4b. Notify challenger that the challenge was declined
      await challengerChannel.send({
        type: 'broadcast',
        event: 'challenge_declined',
        payload: { lobbyId: lobby.id },
      });

      return new Response(JSON.stringify({ message: 'Challenge declined.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      throw new Error('Invalid response type.');
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
