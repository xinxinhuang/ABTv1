import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const BATTLE_DECK_SIZE = 5;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { lobby_id, selected_card_ids } = await req.json();
    if (!lobby_id || !selected_card_ids) throw new Error('Missing lobby_id or selected_card_ids.');
    if (!Array.isArray(selected_card_ids) || selected_card_ids.length !== BATTLE_DECK_SIZE) {
      throw new Error(`You must select exactly ${BATTLE_DECK_SIZE} cards.`);
    }

    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const { data: lobby, error: lobbyError } = await supabaseAdmin.from('battle_lobbies').select('*').eq('id', lobby_id).single();
    if (lobbyError || !lobby) throw new Error('Lobby not found.');
    if (lobby.status !== 'card_selection') throw new Error('Not in card selection phase.');

    const isPlayer1 = lobby.player1_id === user.id;
    const isPlayer2 = lobby.player2_id === user.id;
    if (!isPlayer1 && !isPlayer2) throw new Error('You are not a player in this lobby.');

    const playerField = isPlayer1 ? 'player1' : 'player2';
    if (lobby.battle_state && lobby.battle_state[`${playerField}_ready`]) {
      throw new Error('You have already selected your cards.');
    }

    const { data: playerCards, error: cardsError } = await supabaseAdmin.from('player_cards').select('id').eq('player_id', user.id);
    if (cardsError) throw new Error('Could not verify your cards.');
    const playerCardIds = new Set(playerCards.map(c => c.id));
    for (const cardId of selected_card_ids) {
      if (!playerCardIds.has(cardId)) {
        return new Response(JSON.stringify({ error: `You do not own card with ID ${cardId}.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
      }
    }

    let battle_state = lobby.battle_state || {};
    battle_state[`${playerField}_cards`] = selected_card_ids;
    battle_state[`${playerField}_ready`] = true;

    let newStatus = lobby.status;
    let broadcastEvent = 'state_change';
    const opponentField = isPlayer1 ? 'player2' : 'player1';

    if (battle_state[`${opponentField}_ready`]) {
      newStatus = 'in_progress';
      broadcastEvent = 'battle_start';
      battle_state.turn = 'player1';
      battle_state.player1_health = 100;
      battle_state.player2_health = 100;
      battle_state.player1_deck = battle_state.player1_cards;
      battle_state.player2_deck = battle_state.player2_cards;
      battle_state.player1_hand = []; 
      battle_state.player2_hand = []; 
    }

    const { data: updatedLobby, error: updateError } = await supabaseAdmin
      .from('battle_lobbies')
      .update({ battle_state, status: newStatus })
      .eq('id', lobby_id)
      .select()
      .single();

    if (updateError) throw new Error('Failed to update lobby.');

    const realtimeClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const channel = realtimeClient.channel(`battle:${lobby_id}`);
    await channel.subscribe();
    await channel.send({ type: 'broadcast', event: broadcastEvent, payload: { newState: updatedLobby } });

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
