/**
 * Resolve Battle V2 Edge Function
 * Automatically resolves battles when both players have submitted cards
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for browser compatibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Handle preflight OPTIONS request
function handleOptions(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  return null;
}

/**
 * Calculate battle outcome based on humanoid card attributes
 */
function calculateBattleOutcome(card1: any, card2: any) {
  const card1Total = card1.attributes.str + card1.attributes.dex + card1.attributes.int;
  const card2Total = card2.attributes.str + card2.attributes.dex + card2.attributes.int;

  console.log(`Card 1 total: ${card1Total} (STR: ${card1.attributes.str}, DEX: ${card1.attributes.dex}, INT: ${card1.attributes.int})`);
  console.log(`Card 2 total: ${card2Total} (STR: ${card2.attributes.str}, DEX: ${card2.attributes.dex}, INT: ${card2.attributes.int})`);

  if (card1Total > card2Total) {
    return { winner: 1, loser: 2, margin: card1Total - card2Total };
  } else if (card2Total > card1Total) {
    return { winner: 2, loser: 1, margin: card2Total - card1Total };
  } else {
    return { winner: null, loser: null, margin: 0 }; // Tie
  }
}

/**
 * Main function to resolve a battle
 */
serve(async (req: Request) => {
  // Handle CORS preflight requests
  const preflightResponse = handleOptions(req);
  if (preflightResponse) return preflightResponse;

  try {
    console.log("=== Resolve-battle-v2 Edge Function triggered ===");

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({
          error: "Configuration error",
          message: "Server configuration is incomplete"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      console.error("Error parsing request JSON:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request format. Expected JSON body." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { battle_id } = requestData;

    if (!battle_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameter",
          message: "battle_id is required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Resolving battle: ${battle_id}`);

    // 1. Fetch battle instance
    const { data: battle, error: battleError } = await supabase
      .from("battle_instances")
      .select("*")
      .eq("id", battle_id)
      .single();

    if (battleError || !battle) {
      console.error("Battle not found:", battleError);
      return new Response(
        JSON.stringify({
          error: "Battle not found",
          message: "The specified battle does not exist"
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Check if battle is in correct state for resolution
    if (battle.status !== "cards_revealed") {
      console.log(`Battle not ready for resolution. Status: ${battle.status}`);

      // If battle is in 'active' status but both players have submitted cards,
      // we can update it to 'cards_revealed' and continue with resolution
      if (battle.status === "active") {
        // Check if both players have submitted cards
        const { data: battleCards, error: cardsCheckError } = await supabase
          .from("battle_cards")
          .select("player_id")
          .eq("battle_id", battle_id);

        if (!cardsCheckError && battleCards && battleCards.length === 2) {
          console.log("Both players have submitted cards but battle status is still 'active'. Updating to 'cards_revealed'...");

          const { error: updateError } = await supabase
            .from("battle_instances")
            .update({ status: "cards_revealed" })
            .eq("id", battle_id);

          if (!updateError) {
            console.log("✅ Updated battle status to 'cards_revealed'");
            // Continue with resolution
          } else {
            console.error("Failed to update battle status:", updateError);
            return new Response(
              JSON.stringify({
                error: "Failed to update battle status",
                message: "Could not update battle status to 'cards_revealed'"
              }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        } else {
          return new Response(
            JSON.stringify({
              error: "Invalid battle state",
              message: `Battle must be in 'cards_revealed' status for resolution. Current: ${battle.status}`
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } else {
        return new Response(
          JSON.stringify({
            error: "Invalid battle state",
            message: `Battle must be in 'cards_revealed' status for resolution. Current: ${battle.status}`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 3. Fetch both battle cards with player card details
    const { data: battleCards, error: cardsError } = await supabase
      .from("battle_cards")
      .select(`
        *,
        player_cards (
          id,
          card_name,
          card_type,
          attributes,
          player_id
        )
      `)
      .eq("battle_id", battle_id);

    if (cardsError || !battleCards || battleCards.length !== 2) {
      console.error("Error fetching battle cards:", cardsError);
      return new Response(
        JSON.stringify({
          error: "Invalid battle cards",
          message: "Battle must have exactly 2 cards for resolution"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Identify challenger and opponent cards
    const challengerCard = battleCards.find(bc => bc.player_id === battle.challenger_id);
    const opponentCard = battleCards.find(bc => bc.player_id === battle.opponent_id);

    if (!challengerCard || !opponentCard) {
      console.error("Could not identify challenger and opponent cards");
      return new Response(
        JSON.stringify({
          error: "Invalid battle setup",
          message: "Could not identify cards for both players"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Challenger card: ${challengerCard.player_cards.card_name}`);
    console.log(`Opponent card: ${opponentCard.player_cards.card_name}`);

    // 5. Calculate battle outcome
    const outcome = calculateBattleOutcome(
      challengerCard.player_cards,
      opponentCard.player_cards
    );

    console.log("Battle outcome:", outcome);

    // 6. Determine winner and loser
    let winnerId: string | null = null;
    let loserId: string | null = null;
    let winnerCardId: string | null = null;
    let loserCardId: string | null = null;

    if (outcome.winner === 1) {
      winnerId = battle.challenger_id;
      loserId = battle.opponent_id;
      winnerCardId = challengerCard.card_id;
      loserCardId = opponentCard.card_id;
    } else if (outcome.winner === 2) {
      winnerId = battle.opponent_id;
      loserId = battle.challenger_id;
      winnerCardId = opponentCard.card_id;
      loserCardId = challengerCard.card_id;
    }

    // 7. Update battle instance with results
    const battleUpdate: any = {
      status: "completed",
      winner_id: winnerId,
      loser_id: loserId,
      winner_card_id: winnerCardId,
      loser_card_id: loserCardId,
      battle_result: {
        outcome: outcome.winner ? "victory" : "tie",
        margin: outcome.margin,
        challenger_total: challengerCard.player_cards.attributes.str +
          challengerCard.player_cards.attributes.dex +
          challengerCard.player_cards.attributes.int,
        opponent_total: opponentCard.player_cards.attributes.str +
          opponentCard.player_cards.attributes.dex +
          opponentCard.player_cards.attributes.int
      },
      completed_at: new Date().toISOString()
    };

    const { data: updatedBattle, error: updateError } = await supabase
      .from("battle_instances")
      .update(battleUpdate)
      .eq("id", battle_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating battle:", updateError);
      return new Response(
        JSON.stringify({
          error: "Failed to update battle",
          details: updateError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 8. Reveal cards by updating battle_cards
    const { error: revealError } = await supabase
      .from("battle_cards")
      .update({ is_hidden: false })
      .eq("battle_id", battle_id);

    if (revealError) {
      console.error("Error revealing cards:", revealError);
    }

    // 9. Handle card transfer (if not a tie)
    if (winnerId && loserId && winnerCardId && loserCardId) {
      console.log(`Transferring card ${loserCardId} from ${loserId} to ${winnerId}`);

      const { error: transferError } = await supabase
        .from("player_cards")
        .update({ player_id: winnerId })
        .eq("id", loserCardId);

      if (transferError) {
        console.error("Error transferring card:", transferError);
        // Don't fail the entire resolution for transfer errors
      } else {
        console.log("✅ Card transferred successfully");
      }
    }

    // 10. Broadcast battle completion
    try {
      const realtimeClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );

      const channel = realtimeClient.channel(`battle-v2:${battle_id}`);
      await channel.subscribe();

      await new Promise(resolve => setTimeout(resolve, 100));

      await channel.send({
        type: 'broadcast',
        event: 'battle_resolved',
        payload: {
          battle_id: battle_id,
          winner_id: winnerId,
          loser_id: loserId,
          outcome: outcome,
          battle_result: battleUpdate.battle_result,
          timestamp: new Date().toISOString()
        }
      });

      console.log("✅ Broadcasted battle resolution");

      await realtimeClient.removeChannel(channel);
    } catch (broadcastError) {
      console.error("Error broadcasting battle resolution:", broadcastError);
    }

    console.log("✅ Battle resolved successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Battle resolved successfully",
        battle_id: battle_id,
        winner_id: winnerId,
        loser_id: loserId,
        outcome: outcome.winner ? "victory" : "tie",
        margin: outcome.margin
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error resolving battle:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});