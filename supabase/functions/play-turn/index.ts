// deno-lint-ignore-file
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { lobby_id, move } = await req.json();
    if (!lobby_id || !move) throw new Error('Missing lobby_id or move data.');

    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const { data: lobby, error: lobbyError } = await supabaseAdmin.from('battle_lobbies').select('*').eq('id', lobby_id).single();
    if (lobbyError || !lobby) throw new Error('Lobby not found.');
    if (lobby.status !== 'in_progress') throw new Error('Battle is not in progress.');

    let { battle_state } = lobby;
    const playerField = battle_state.turn;
    const opponentField = playerField === 'player1' ? 'player2' : 'player1';

    if (lobby[`${playerField}_id`] !== user.id) {
      throw new Error('It is not your turn.');
    }

    battle_state.log = battle_state.log || [];

    // --- Fetch all card data for this battle from the database ---
    const allCardIds = [...battle_state.player1_cards, ...battle_state.player2_cards];
    const { data: allCardsData, error: cardsError } = await supabaseAdmin.from('battle_cards').select('*').in('id', allCardIds);
    if (cardsError) throw new Error('Could not fetch card data.');
    const cardsMap = new Map(allCardsData.map(c => [c.id, c]));

    // --- Apply Move Logic ---
    if (move.type === 'attack') {
      const { attacker_card_id, defender_card_id } = move;
      if (!battle_state[`${playerField}_hand`].includes(attacker_card_id)) {
        throw new Error('Attacker card is not in your hand.');
      }
      if (!battle_state[`${opponentField}_hand`].includes(defender_card_id)) {
        throw new Error('Defender card is not in the opponent\'s hand.');
      }

      const attackerCard = cardsMap.get(attacker_card_id);
      const defenderCard = cardsMap.get(defender_card_id);
      if (!attackerCard || !defenderCard) throw new Error('Card data not found.');

      const damage = attackerCard.attributes.attack || 0;
      battle_state[`${opponentField}_health`] -= damage;
      battle_state.log.push(`${attackerCard.name} attacks ${defenderCard.name} for ${damage} damage.`);
    }

    // --- Check for Win/Loss ---
    let newStatus = lobby.status;
    let broadcastEvent = 'state_change';
    if (battle_state[`${opponentField}_health`] <= 0) {
      newStatus = 'completed';
      broadcastEvent = 'battle_over';
      battle_state.winner = playerField;
      battle_state.log.push(`Battle over! ${playerField} is victorious!`);
    }

    // --- Update Turn ---
    if (newStatus === 'in_progress') {
      battle_state.turn = opponentField;
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

    return new Response(JSON.stringify({ success: true, message: 'Turn processed.' }), {
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
