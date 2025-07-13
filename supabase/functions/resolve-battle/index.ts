// deno-lint-ignore-file
// @ts-nocheck

// Follow Deno's ES modules pattern
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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

// Main function to serve HTTP requests
serve(async (req: Request) => {
  // Handle CORS preflight requests
  const preflightResponse = handleOptions(req);
  if (preflightResponse) return preflightResponse;

  try {
    // Create Supabase client with service role key (for admin privileges)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { lobby_id } = await req.json();

    if (!lobby_id) {
      return new Response(
        JSON.stringify({ error: "Missing lobby_id parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Resolving battle for lobby: ${lobby_id}`);

    // 1. Get the battle instance
    const { data: lobby, error: lobbyError } = await supabase
      .from("battle_instances")
      .select("*")
      .eq("id", lobby_id)
      .single();

    if (lobbyError || !lobby) {
      return new Response(
        JSON.stringify({ error: "Battle lobby not found", details: lobbyError }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if the battle is in the correct state to be resolved
    if (lobby.status !== "cards_revealed") {
      return new Response(
        JSON.stringify({ 
          error: "Battle cannot be resolved", 
          details: `Current status is ${lobby.status}, must be 'cards_revealed'` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Get both players' card selections
    const { data: selections, error: selectionsError } = await supabase
      .from("battle_selections")
      .select("*, player_cards(*, cards(*))")
      .eq("lobby_id", lobby_id);

    if (selectionsError || !selections || selections.length !== 2) {
      return new Response(
        JSON.stringify({ 
          error: "Could not retrieve both players' selections", 
          details: selectionsError 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Determine which selection belongs to which player
    const player1Selection = selections.find((s: any) => s.player_id === lobby.challenger_id);
    const player2Selection = selections.find((s: any) => s.player_id === lobby.opponent_id);

    if (!player1Selection || !player2Selection) {
      return new Response(
        JSON.stringify({ error: "Missing selection for one or both players" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract card data
    const player1Card = player1Selection.player_cards.cards;
    const player2Card = player2Selection.player_cards.cards;

    // 4. Determine the winner based on game rules
    let winnerId: string | null = null;
    let explanation = "";

    // Type advantage check (Rock-Paper-Scissors style)
    if (player1Card.type === player2Card.type) {
      // Same type - compare primary attributes
      const cardType = player1Card.type;
      let attributeToCompare = "";
      
      switch (cardType.toLowerCase()) {
        case "space marine":
          attributeToCompare = "str";
          break;
        case "galactic ranger":
          attributeToCompare = "dex";
          break;
        case "void sorcerer":
          attributeToCompare = "int";
          break;
        default:
          attributeToCompare = "str"; // Default to strength
      }

      const player1Value = player1Card.attributes[attributeToCompare] || 0;
      const player2Value = player2Card.attributes[attributeToCompare] || 0;

      if (player1Value > player2Value) {
        winnerId = lobby.challenger_id;
        explanation = `Both players selected ${cardType}s. Challenger's card has higher ${attributeToCompare} (${player1Value} vs ${player2Value}).`;
      } else if (player2Value > player1Value) {
        winnerId = lobby.opponent_id;
        explanation = `Both players selected ${cardType}s. Opponent's card has higher ${attributeToCompare} (${player2Value} vs ${player1Value}).`;
      } else {
        // It's a tie - no winner
        explanation = `Both players selected ${cardType}s with equal ${attributeToCompare} (${player1Value}). The battle is a draw.`;
      }
    } else {
      // Different types - check type advantage
      if (
        (player1Card.type.toLowerCase() === "void sorcerer" && player2Card.type.toLowerCase() === "space marine") ||
        (player1Card.type.toLowerCase() === "space marine" && player2Card.type.toLowerCase() === "galactic ranger") ||
        (player1Card.type.toLowerCase() === "galactic ranger" && player2Card.type.toLowerCase() === "void sorcerer")
      ) {
        winnerId = lobby.challenger_id;
        explanation = `Challenger's ${player1Card.type} has type advantage over Opponent's ${player2Card.type}.`;
      } else {
        winnerId = lobby.opponent_id;
        explanation = `Opponent's ${player2Card.type} has type advantage over Challenger's ${player1Card.type}.`;
      }
    }

    // 5. Update the battle instance with the result
    const { error: updateError } = await supabase
      .from("battle_instances")
      .update({
        status: "completed",
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
        explanation: explanation, // Store the explanation for display in battle results
      })
      .eq("id", lobby_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update battle status", details: updateError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6. If there's a winner, transfer the card from loser to winner
    if (winnerId) {
      const loserId = winnerId === lobby.challenger_id ? lobby.opponent_id : lobby.challenger_id;
      const loserSelection = winnerId === lobby.challenger_id ? player2Selection : player1Selection;
      
      // Update card ownership
      const { error: transferError } = await supabase
        .from("player_cards")
        .update({ player_id: winnerId })
        .eq("id", loserSelection.player_card_id);

      if (transferError) {
        console.error("Error transferring card:", transferError);
        // Continue despite error - we'll log but not fail the whole operation
      }

      // Record the transfer in history
      await supabase.from("card_ownership_history").insert({
        card_id: loserSelection.player_card_id,
        previous_owner_id: loserId,
        new_owner_id: winnerId,
        transfer_type: "battle",
        battle_id: lobby_id,
      });

      // Create notifications for both players
      await supabase.from("notifications").insert([
        {
          user_id: winnerId,
          message: `You won the battle! You claimed your opponent's ${loserSelection.player_cards.cards.name} card.`,
          type: "battle_won",
          reference_id: lobby_id,
        },
        {
          user_id: loserId,
          message: `You lost the battle. Your opponent claimed your ${loserSelection.player_cards.cards.name} card.`,
          type: "battle_lost",
          reference_id: lobby_id,
        },
      ]);
    } else {
      // It was a draw
      await supabase.from("notifications").insert([
        {
          user_id: lobby.challenger_id,
          message: "The battle ended in a draw. No cards were exchanged.",
          type: "battle_draw",
          reference_id: lobby_id,
        },
        {
          user_id: lobby.opponent_id,
          message: "The battle ended in a draw. No cards were exchanged.",
          type: "battle_draw",
          reference_id: lobby_id,
        },
      ]);
    }

    // 7. Return the result
    return new Response(
      JSON.stringify({
        success: true,
        winner_id: winnerId,
        explanation,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error resolving battle:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
