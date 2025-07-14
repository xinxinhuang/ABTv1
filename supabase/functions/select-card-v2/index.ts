// deno-lint-ignore-file
// @ts-nocheck

// Follow Deno's ES modules pattern
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
    console.log("Select-card-v2 Edge Function triggered");
    
    // Create Supabase client with service role key (for admin privileges)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
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

    if (!battle_id || !resolvedPlayer || !resolvedCard) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters", 
          message: "battle_id, player_id (or user_id), and card_id (or selected_card_id) are required" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Verify the battle exists and is active
    const { data: battle, error: battleError } = await supabase
      .from("battle_instances")
      .select("*")
      .eq("id", battle_id)
      .single();

    if (battleError || !battle) {
      console.error("Error fetching battle:", battleError);
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

    if (battle.status !== "active") {
      return new Response(
        JSON.stringify({ 
          error: "Invalid battle status", 
          message: `Battle is not active. Current status: ${battle.status}` 
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

    // 2. Verify the player owns the card
    const { data: cardOwnership, error: cardOwnershipError } = await supabase
      .from("player_cards")
      .select("*")
      .eq("id", resolvedCard)
      .eq("player_id", resolvedPlayer)
      .single();

    if (cardOwnershipError || !cardOwnership) {
      console.error("Card ownership verification failed:", cardOwnershipError);
      return new Response(
        JSON.stringify({ 
          error: "Card not owned", 
          message: "You do not own this card" 
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine which player is selecting their card
    // Map challenger_id to player1_id and opponent_id to player2_id
    const isChallenger = resolvedPlayer === battle.challenger_id;
    
    // Ensure we have both player IDs for the battle_selections table
    const player1_id = battle.challenger_id;
    const player2_id = battle.opponent_id;
    
    // 3. Record the card selection using upsert to prevent duplicates
    // First, check if a selection record already exists
    const { data: existingSelection, error: existingSelectionError } = await supabase
      .from("battle_selections")
      .select("*")
      .eq("battle_id", battle_id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid error when no record exists

    console.log('Existing selection record:', existingSelection);
    // Only log real errors, not the expected case of no record found
    if (existingSelectionError && existingSelectionError.code !== 'PGRST116') {
      console.error('Error fetching existing selection:', existingSelectionError);
    }

    // Prepare the update data based on which player is making the selection
    let updateData = {};
    
    if (existingSelection) {
      // If a record exists, only update the specific player's card selection
      updateData = isChallenger
        ? { 
            player1_card_id: resolvedCard,
            player1_id: player1_id, // Use the challenger_id as player1_id
            player1_submitted_at: new Date().toISOString()
          }
        : { 
            player2_card_id: resolvedCard,
            player2_id: player2_id, // Use the opponent_id as player2_id
            player2_submitted_at: new Date().toISOString()
          };
      
      // Add the battle_id to the update data for the upsert operation
      updateData.battle_id = battle_id;
    } else {
      // If no record exists, create a new one with the appropriate player data
      updateData = isChallenger
        ? { 
            battle_id, 
            player1_card_id: resolvedCard,
            player1_id: player1_id, // Use the challenger_id as player1_id
            player1_submitted_at: new Date().toISOString(),
            player2_id: player2_id  // Include player2_id to ensure both players are recorded
          }
        : { 
            battle_id, 
            player2_card_id: resolvedCard,
            player2_id: player2_id, // Use the opponent_id as player2_id
            player2_submitted_at: new Date().toISOString(),
            player1_id: player1_id  // Include player1_id to ensure both players are recorded
          };
    }

    console.log("Updating battle selection with data:", JSON.stringify(updateData));

    // FIX: Using admin client with service role key to ensure we can update the battle
    const { data: selectionData, error: selectionError } = await supabase
      .from("battle_selections")
      .upsert(updateData, {
        onConflict: 'battle_id', // Keep using single column conflict for compatibility
        returning: "minimal" // No need to return the full record for performance
      });

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

    // 4. Check if both players have selected cards and update battle status if needed
    const { data: updatedSelection, error: updatedSelectionError } = await supabase
      .from("battle_selections")
      .select("*")
      .eq("battle_id", battle_id)
      .single();

    console.log("Updated selection record:", updatedSelection);

    // IMPORTANT: Explicitly use the admin client with service role key for the update
    if (updatedSelection?.player1_card_id && updatedSelection?.player2_card_id) {
      console.log("Both players have selected cards. Updating battle status to 'cards_revealed'.");
      
      // Use explicit admin client to update battle status to ensure RLS doesn't block
      const adminClient = createClient(supabaseUrl, supabaseKey);
      
      const { error: updateError } = await adminClient
        .from("battle_instances")
        .update({ status: "cards_revealed" })
        .eq("id", battle_id)
        .select('id, status');

      if (updateError) {
        console.error("Error updating battle status:", updateError);
        // Don't return an error response, just log it - the selection was still successful
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Card selection recorded successfully" }),
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
