/**
 * Select Card V2 Edge Function - Rebuilt for Battle Arena V2
 * Enhanced validation for humanoid-only battle system
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
 * Main function to handle card selection in a battle
 * This function allows a player to select a card for a battle
 */
serve(async (req: Request) => {
  // Handle CORS preflight requests
  const preflightResponse = handleOptions(req);
  if (preflightResponse) return preflightResponse;

  try {
    console.log("=== Select-card-v2 Edge Function triggered ===");
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);

    // Create Supabase client with service role key (for admin privileges)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // Log environment variable status (without revealing actual values)
    console.log(`SUPABASE_URL available: ${!!supabaseUrl}`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY available: ${!!supabaseKey}`);

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({
          error: "Configuration error",
          message: "Server configuration is incomplete. Please contact support."
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

    // Extract and validate required parameters - support both naming conventions
    const {
      battle_id,
      player_id,     // new parameter name
      user_id,       // old parameter name
      card_id,       // new parameter name
      selected_card_id // old parameter name
    } = requestData;

    // Resolve the actual parameters to use
    const resolvedPlayer = player_id || user_id;
    const resolvedCard = card_id || selected_card_id;

    console.log(`Processing selection request: Battle ID: ${battle_id}, Player ID: ${resolvedPlayer}, Card ID: ${resolvedCard}`);
    console.log('Full request data:', JSON.stringify(requestData));

    // Add more detailed logging for debugging
    console.log('Request validation:');
    console.log('- battle_id present:', !!battle_id);
    console.log('- battle_id value:', battle_id);
    console.log('- resolvedPlayer present:', !!resolvedPlayer);
    console.log('- resolvedPlayer value:', resolvedPlayer);
    console.log('- resolvedCard present:', !!resolvedCard);
    console.log('- resolvedCard value:', resolvedCard);

    if (!battle_id || !resolvedPlayer || !resolvedCard) {
      console.error('Missing required parameters:', {
        battle_id: !!battle_id,
        resolvedPlayer: !!resolvedPlayer,
        resolvedCard: !!resolvedCard,
        requestData
      });
      return new Response(
        JSON.stringify({
          error: "Missing required parameters",
          message: "battle_id, player_id (or user_id), and card_id (or selected_card_id) are required",
          received: {
            battle_id: !!battle_id,
            player_id: !!resolvedPlayer,
            card_id: !!resolvedCard
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Verify the battle exists and is active
    console.log("Step 1: Verifying battle exists and is active");
    const { data: battle, error: battleError } = await supabase
      .from("battle_instances")
      .select("*")
      .eq("id", battle_id)
      .single();

    console.log("Battle query result:", { battle, battleError });

    if (battleError || !battle) {
      console.error("Error fetching battle:", battleError);
      return new Response(
        JSON.stringify({
          error: "Battle not found",
          message: "The specified battle does not exist",
          details: battleError?.message || "No battle data returned"
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if battle is in a valid state for card selection
    const validStatuses = ["active"]; // V2: Only 'active' status allows card selection
    if (!validStatuses.includes(battle.status)) {
      console.error(`Invalid battle status for card selection: ${battle.status}`);
      return new Response(
        JSON.stringify({
          error: "INVALID_BATTLE_STATUS",
          message: `Battle is not ready for card selection. Current status: ${battle.status}. Expected: active`,
          details: `Battle must be in 'active' status to allow card selection. Current status: ${battle.status}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify that the player is part of this battle
    // Verify that the player is one of the participants in the battle
    if (resolvedPlayer !== battle.challenger_id && resolvedPlayer !== battle.opponent_id) {
      console.error("Player not in battle:", resolvedPlayer, battle.challenger_id, battle.opponent_id);
      return new Response(
        JSON.stringify({
          error: "Player not in battle",
          message: "You are not a participant in this battle"
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Verify the player owns the card and it's a humanoid card
    console.log("Step 2: Verifying humanoid card ownership");
    console.log(`Checking if player ${resolvedPlayer} owns humanoid card ${resolvedCard}`);

    const { data: cardOwnership, error: cardOwnershipError } = await supabase
      .from("player_cards")
      .select("*")
      .eq("id", resolvedCard)
      .eq("player_id", resolvedPlayer)
      .eq("card_type", "humanoid") // STRICT: Only humanoid cards allowed
      .maybeSingle();

    console.log("Humanoid card ownership query result:", { cardOwnership, cardOwnershipError });

    if (cardOwnershipError) {
      console.error("Card ownership verification failed:", cardOwnershipError);
      return new Response(
        JSON.stringify({
          error: "CARD_OWNERSHIP_ERROR",
          message: "Failed to verify card ownership",
          details: cardOwnershipError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!cardOwnership) {
      console.error("Humanoid card not found or not owned by player");
      return new Response(
        JSON.stringify({
          error: "HUMANOID_CARD_NOT_OWNED",
          message: "You do not own this humanoid card or the card does not exist. Only humanoid cards can be used in battles."
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2.1. Validate humanoid card attributes
    console.log("Step 2.1: Validating humanoid card attributes");
    const cardAttributes = cardOwnership.attributes;
    
    if (!cardAttributes || typeof cardAttributes !== 'object') {
      console.error("Invalid card attributes:", cardAttributes);
      return new Response(
        JSON.stringify({
          error: "INVALID_CARD_ATTRIBUTES",
          message: "Card has invalid or missing attributes"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate required humanoid attributes
    const requiredAttributes = ['str', 'dex', 'int'];
    const missingAttributes = requiredAttributes.filter(attr => 
      typeof cardAttributes[attr] !== 'number' || 
      cardAttributes[attr] < 0 || 
      cardAttributes[attr] > 100
    );

    if (missingAttributes.length > 0) {
      console.error("Invalid humanoid attributes:", { cardAttributes, missingAttributes });
      return new Response(
        JSON.stringify({
          error: "INVALID_HUMANOID_ATTRIBUTES",
          message: `Invalid humanoid card attributes. Missing or invalid: ${missingAttributes.join(', ')}`,
          details: "Humanoid cards must have str, dex, and int attributes between 0-100"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Valid humanoid card: ${cardOwnership.card_name} (STR: ${cardAttributes.str}, DEX: ${cardAttributes.dex}, INT: ${cardAttributes.int})`)

    // Determine which player is selecting their card
    // Map challenger_id to player1_id and opponent_id to player2_id
    const isChallenger = resolvedPlayer === battle.challenger_id;

    // Ensure we have both player IDs for the battle_selections table
    const player1_id = battle.challenger_id;
    const player2_id = battle.opponent_id;

    // 3. Check if player has already selected a card for this battle
    const { data: existingCard, error: existingCardError } = await supabase
      .from("battle_cards")
      .select("*")
      .eq("battle_id", battle_id)
      .eq("player_id", resolvedPlayer)
      .maybeSingle();

    if (existingCard) {
      console.error("Player has already selected a card for this battle");
      return new Response(
        JSON.stringify({
          error: "CARD_ALREADY_SELECTED",
          message: "You have already selected a card for this battle",
          details: `Card ${existingCard.card_id} was already selected at ${existingCard.created_at}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Insert the card selection into battle_cards table
    console.log("Step 3: Recording card selection");
    const { data: cardSelection, error: selectionError } = await supabase
      .from("battle_cards")
      .insert({
        battle_id,
        player_id: resolvedPlayer,
        card_id: resolvedCard,
        is_hidden: true
      })
      .select()
      .single();

    if (selectionError) {
      console.error("Error recording card selection:", selectionError);
      return new Response(
        JSON.stringify({
          error: "Failed to record card selection",
          details: selectionError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Check if both players have selected cards
    const { data: allCards, error: allCardsError } = await supabase
      .from("battle_cards")
      .select("*")
      .eq("battle_id", battle_id);

    console.log("All cards for battle:", allCards);

    // Check if both players have now selected cards
    const bothPlayersSubmitted = allCards && allCards.length === 2;
    let battleStatus = "in_progress"; // Keep as in_progress

    if (bothPlayersSubmitted) {
      console.log("Both players have selected cards, battle ready for resolution");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Card selection recorded successfully",
        status: battleStatus,
        both_submitted: bothPlayersSubmitted
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error selecting card:", error);
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
