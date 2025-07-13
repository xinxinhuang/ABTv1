// deno-lint-ignore-file
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define CORS headers directly in the file
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BATTLE_DECK_SIZE = 1;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { battle_id, selected_card_id } = await req.json();
    if (!battle_id || !selected_card_id) throw new Error('Missing battle_id or selected_card_id.');
    if (typeof selected_card_id !== 'string') {
      throw new Error('selected_card_id must be a string.');
    }

    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const { data: battle, error: battleError } = await supabaseAdmin.from('battle_instances').select('*').eq('id', battle_id).single();
    if (battleError || !battle) throw new Error('Battle not found.');
    if (battle.status !== 'active') throw new Error('Not in card selection phase.');

    const isChallenger = battle.challenger_id === user.id;
    const isOpponent = battle.opponent_id === user.id;
    if (!isChallenger && !isOpponent) throw new Error('You are not a player in this battle.');
    
    // Check if the player has already submitted selections
    const { data: existingSelections, error: selectionError } = await supabaseAdmin
      .from('battle_selections')
      .select('*')
      .eq('battle_id', battle_id)
      .eq('player_id', user.id);
      
    if (selectionError) throw new Error('Failed to check existing selections.');
    if (existingSelections && existingSelections.length > 0) {
      throw new Error('You have already selected your cards.');
    }

    const { data: playerCards, error: cardsError } = await supabaseAdmin.from('player_cards').select('id').eq('player_id', user.id);
    if (cardsError) throw new Error('Could not verify your cards.');
    const playerCardIds = new Set(playerCards.map(c => c.id));
    if (!playerCardIds.has(selected_card_id)) {
      return new Response(JSON.stringify({ error: `You do not own card with ID ${selected_card_id}.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    // Insert selection into battle_selections table
    const selectionToInsert = {
      battle_id: battle_id,
      player_id: user.id,
      player_card_id: selected_card_id,
    };
    
    const { error: insertError } = await supabaseAdmin
      .from('battle_selections')
      .insert(selectionToInsert);
      
    if (insertError) throw new Error('Failed to save your card selections.');
    
    // Check if both players have now made selections
    const { data: allSelections, error: allSelectionsError } = await supabaseAdmin
      .from('battle_selections')
      .select('player_id')
      .eq('battle_id', battle_id);
      
    if (allSelectionsError) throw new Error('Failed to check battle status.');
    
    // If selections from both players exist, update battle status
    let newStatus = battle.status;
    let broadcastEvent = 'state_change';
    
    // Get unique player IDs who have submitted selections
    const uniquePlayerIds = new Set(allSelections.map(s => s.player_id));
    
    // If both players have selected cards, update status
    if (uniquePlayerIds.size === 2) {
      newStatus = 'cards_revealed';
      broadcastEvent = 'cards_revealed';
      
      // Update battle status
      const { error: updateError } = await supabaseAdmin
        .from('battle_instances')
        .update({ status: newStatus })
        .eq('id', battle_id);
        
      if (updateError) throw new Error('Failed to update battle status.');
    }

    // Broadcast update to realtime channel
    const realtimeClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const channel = realtimeClient.channel(`battle:${battle_id}`);
    await channel.subscribe();
    await channel.send({ type: 'broadcast', event: broadcastEvent, payload: { battle_id, player_id: user.id } });

    return new Response(JSON.stringify({ success: true, message: 'Cards selected.' }), {
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
