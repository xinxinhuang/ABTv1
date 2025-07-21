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
    console.log('Request received:', req.method, req.url);
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const { lobby_id, response, user_id } = requestBody;
    if (!lobby_id || !response || !user_id) {
      throw new Error(`Missing required fields. lobby_id: ${lobby_id}, response: ${response}, user_id: ${user_id}`);
    }

    // 1. Fetch the battle instance
    const { data: lobby, error: lobbyError } = await supabaseAdmin
      .from('battle_instances')
      .select('id, challenger_id, opponent_id, status')
      .eq('id', lobby_id)
      .single();

    if (lobbyError) {
      console.error('Error fetching lobby:', lobbyError);
      throw new Error(`Database error: ${lobbyError.message}`);
    }
    if (!lobby) {
      console.error('Lobby not found for ID:', lobby_id);
      throw new Error('Lobby not found.');
    }
    
    console.log('Found lobby:', JSON.stringify(lobby, null, 2));

    // 2. Security Check: Ensure the user responding is the opponent
    const isOpponent = lobby.opponent_id === user_id;
                      
    if (!isOpponent) {
      const errorMsg = `User ${user_id} is not the opponent for lobby ${lobby_id}. ` +
                     `Expected opponent: ${lobby.opponent_id}, ` +
                     `Challenger: ${lobby.challenger_id}`;
      console.error(errorMsg);
      throw new Error('You are not authorized to respond to this challenge.');
    }

    if (!(lobby.status === 'awaiting_opponent' || lobby.status === 'pending')) {
      console.error(`Lobby ${lobby_id} has status '${lobby.status}', expected 'awaiting_opponent' or 'pending'`);
      throw new Error('This challenge has already been responded to or is in an invalid state.');
    }

    const realtimeClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const challengerChannel = realtimeClient.channel(`users:${lobby.challenger_id}`);
    await challengerChannel.subscribe();

    if (response === 'accepted') {
      // 3a. Update battle instance status to 'active'
      const { error: updateError } = await supabaseAdmin
        .from('battle_instances')
        .update({ status: 'active' })
        .eq('id', lobby_id);

      if (updateError) {
        console.error('Error updating battle instance:', updateError);
        throw new Error(`Failed to accept challenge: ${updateError.message}`);
      }

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
      // 3b. Update the battle instance status to 'declined'
      const { error: deleteError } = await supabaseAdmin
        .from('battle_instances')
        .update({ status: 'declined' })
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
