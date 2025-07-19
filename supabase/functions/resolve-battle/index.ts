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

/**
 * Main function to resolve a battle between two players
 * This Edge Function is triggered after both players have selected their cards
 * and the battle status has been updated to 'cards_revealed'
 */
serve(async (req: Request) => {
  // Handle CORS preflight requests
  const preflightResponse = handleOptions(req);
  if (preflightResponse) return preflightResponse;

  try {
    console.log("Resolve-battle Edge Function triggered");
    
    // Create Supabase client with service role key (for admin privileges)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const requestData = await req.json();
    const battleId = requestData.battle_id;

    if (!battleId) {
      return new Response(
        JSON.stringify({ error: "Missing battle_id parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Resolving battle for ID: ${battleId}`);

    // 1. Get the battle instance
    const { data: battle, error: battleError } = await supabase
      .from("battle_instances")
      .select("*")
      .eq("id", battleId)
      .single();

    if (battleError || !battle) {
      console.error("Battle not found:", battleError);
      return new Response(
        JSON.stringify({ error: "Battle not found", details: battleError }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if the battle is in the correct state to be resolved
    if (battle.status !== "cards_revealed") {
      console.error(`Battle cannot be resolved. Current status: ${battle.status}`);
      console.error(`Battle ID: ${battle.id}, Challenger: ${battle.challenger_id}, Opponent: ${battle.opponent_id}`);
      return new Response(
        JSON.stringify({ 
          error: "Battle cannot be resolved", 
          details: `Current status is ${battle.status}, must be 'cards_revealed'`,
          battle_id: battle.id
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`Battle status is correct: ${battle.status}, proceeding with resolution`);
    console.log(`Battle participants: Challenger ${battle.challenger_id}, Opponent ${battle.opponent_id}`);

    // 2. Get the player cards from battle_cards table
    console.log("Fetching player card selections");
    
    const { data: battleCards, error: cardsError } = await supabase
      .from("battle_cards")
      .select("*")
      .eq("battle_id", battleId);
    
    if (cardsError || !battleCards) {
      console.error("Error fetching battle cards:", cardsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch battle cards", details: cardsError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Make sure both players have submitted their card selections
    if (battleCards.length !== 2) {
      console.error("Incomplete battle cards:", battleCards);
      return new Response(
        JSON.stringify({ error: "Both players must select cards to resolve the battle" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Find cards for each player
    const challengerCard = battleCards.find(card => card.player_id === battle.challenger_id);
    const opponentCard = battleCards.find(card => card.player_id === battle.opponent_id);
    
    if (!challengerCard || !opponentCard) {
      console.error("Unable to find cards for both players");
      return new Response(
        JSON.stringify({ error: "Unable to find cards for both players" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const challengerCardId = challengerCard.card_id;
    const opponentCardId = opponentCard.card_id;
    
    console.log(`Challenger card ID: ${challengerCardId}`);
    console.log(`Opponent card ID: ${opponentCardId}`);

    // 3. Fetch the detailed card information for each player's selection
    console.log("Fetching card details");
    
    const { data: challengerCardData, error: challengerCardError } = await supabase
      .from("player_cards")
      .select("id, player_id, card_name, card_type, rarity, attributes")
      .eq("id", challengerCardId)
      .single();
      
    if (challengerCardError || !challengerCardData) {
      console.error("Error fetching challenger card:", challengerCardError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch challenger's card", details: challengerCardError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const { data: opponentCardData, error: opponentCardError } = await supabase
      .from("player_cards")
      .select("id, player_id, card_name, card_type, rarity, attributes")
      .eq("id", opponentCardId)
      .single();
      
    if (opponentCardError || !opponentCardData) {
      console.error("Error fetching opponent card:", opponentCardError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch opponent's card", details: opponentCardError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Determine the winner based on game rules
    console.log("Determining battle winner");
    
    let winnerId: string | null = null;
    let explanation = "";
    
    // Extract actual card data (data is stored directly in player_cards table)
    const player1CardData = {
      name: challengerCardData.card_name,
      type: challengerCardData.card_type,
      rarity: challengerCardData.rarity,
      attributes: challengerCardData.attributes
    };
    const player2CardData = {
      name: opponentCardData.card_name,
      type: opponentCardData.card_type,
      rarity: opponentCardData.rarity,
      attributes: opponentCardData.attributes
    };
    
    // Type advantage check (Rock-Paper-Scissors style)
    if (player1CardData.type === player2CardData.type) {
      // Same type - compare primary attributes
      const cardType = player1CardData.type;
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

      const player1Value = player1CardData.attributes?.[attributeToCompare] || 0;
      const player2Value = player2CardData.attributes?.[attributeToCompare] || 0;

      if (player1Value > player2Value) {
        winnerId = battle.challenger_id;
        explanation = `Both players selected ${cardType}s. Challenger's card has higher ${attributeToCompare} (${player1Value} vs ${player2Value}).`;
      } else if (player2Value > player1Value) {
        winnerId = battle.opponent_id;
        explanation = `Both players selected ${cardType}s. Opponent's card has higher ${attributeToCompare} (${player2Value} vs ${player1Value}).`;
      } else {
        // It's a tie - no winner
        explanation = `Both players selected ${cardType}s with equal ${attributeToCompare} (${player1Value}). The battle is a draw.`;
      }
    } else {
      // Different types - check type advantage
      if (
        (player1CardData.type.toLowerCase() === "void sorcerer" && player2CardData.type.toLowerCase() === "space marine") ||
        (player1CardData.type.toLowerCase() === "space marine" && player2CardData.type.toLowerCase() === "galactic ranger") ||
        (player1CardData.type.toLowerCase() === "galactic ranger" && player2CardData.type.toLowerCase() === "void sorcerer")
      ) {
        winnerId = battle.challenger_id;
        explanation = `Challenger's ${player1CardData.type} has type advantage over Opponent's ${player2CardData.type}.`;
      } else {
        winnerId = battle.opponent_id;
        explanation = `Opponent's ${player2CardData.type} has type advantage over Challenger's ${player1CardData.type}.`;
      }
    }

    // 5. Battle cards are already recorded when players selected them
    // No need to insert again, just log the cards being used
    console.log(`Using battle cards: Challenger "${player1CardData.name}", Opponent "${player2CardData.name}"`);
    console.log(`Card types: ${player1CardData.type} vs ${player2CardData.type}`);
    
    // 6. Update the battle instance with the result
    console.log(`Battle winner determined: ${winnerId || 'Draw'}`);
    console.log(`Explanation: ${explanation}`);
    
    const { error: updateError } = await supabase
      .from("battle_instances")
      .update({
        status: "completed",
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
        explanation: explanation,
      })
      .eq("id", battleId);

    if (updateError) {
      console.error("Error updating battle status:", updateError);
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
      const loserId = winnerId === battle.challenger_id ? battle.opponent_id : battle.challenger_id;
      const loserPlayerCardId = winnerId === battle.challenger_id ? opponentCardId : challengerCardId;
      const loserCardName = winnerId === battle.challenger_id ? player2CardData.name : player1CardData.name;
      const winnerName = winnerId === battle.challenger_id ? player1CardData.name : player2CardData.name;

      console.log(`Battle winner: ${winnerId} with card "${winnerName}"`);
      console.log(`Transferring card "${loserCardName}" (ID: ${loserPlayerCardId}) from ${loserId} to ${winnerId}`);
      
      // Update card ownership in player_cards table
      const { data: transferData, error: transferError } = await supabase
        .from("player_cards")
        .update({ player_id: winnerId })
        .eq("id", loserPlayerCardId)
        .select();
        
      if (transferError) {
        console.error("Error transferring card:", transferError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to transfer card", 
            details: transferError,
            card_id: loserPlayerCardId,
            winner_id: winnerId,
            loser_id: loserId 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.log(`Card ownership updated successfully:`, transferData);
      
      // Record the transfer in card_ownership_history
      const { data: historyData, error: historyError } = await supabase
        .from("card_ownership_history")
        .insert({
          card_id: loserPlayerCardId,
          previous_owner_id: loserId,
          new_owner_id: winnerId,
          transfer_type: "battle_win",
          battle_id: battleId
        })
        .select();
        
      if (historyError) {
        console.error("Error recording card transfer history:", historyError);
        // We don't return an error response here since the transfer already happened
      } else {
        console.log(`Card transfer history recorded successfully:`, historyData);
      }
      
      // Create detailed notifications for both players
      const { data: notifData, error: notifError } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: winnerId,
            message: `Victory! You won the battle with ${winnerId === battle.challenger_id ? player1CardData.name : player2CardData.name} and claimed ${loserCardName}!`,
            type: "battle_win",
            reference_id: battleId,
            metadata: { 
              winner_card: winnerId === battle.challenger_id ? player1CardData.name : player2CardData.name,
              loser_card: loserCardName
            }
          },
          {
            user_id: loserId,
            message: `Defeat! You lost the battle and your ${loserCardName} card was claimed by your opponent.`,
            type: "battle_loss",
            reference_id: battleId,
            metadata: { 
              winner_card: winnerId === battle.challenger_id ? player1CardData.name : player2CardData.name,
              loser_card: loserCardName
            }
          },
        ])
        .select();
        
      if (notifError) {
        console.error("Error creating battle result notifications:", notifError);
      } else {
        console.log("Battle notifications created successfully:", notifData);
      }
    } else {
      // It's a tie, create detailed tie notifications
      const { data: tieNotifData, error: tieNotifError } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: battle.challenger_id,
            message: `Draw! Your ${player1CardData.name} tied with opponent's ${player2CardData.name}. No cards were exchanged.`,
            type: "battle_tie",
            reference_id: battleId,
            metadata: { 
              player_card: player1CardData.name,
              opponent_card: player2CardData.name
            }
          },
          {
            user_id: battle.opponent_id,
            message: `Draw! Your ${player2CardData.name} tied with opponent's ${player1CardData.name}. No cards were exchanged.`,
            type: "battle_tie",
            reference_id: battleId,
            metadata: { 
              player_card: player2CardData.name,
              opponent_card: player1CardData.name
            }
          },
        ])
        .select();
        
      if (tieNotifError) {
        console.error("Error creating battle tie notifications:", tieNotifError);
      } else {
        console.log("Battle tie notifications created successfully:", tieNotifData);
      }
    }

    // 7. Return the result
    console.log("Battle resolution completed successfully");
    
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
