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
      .maybeSingle();

    console.log('Existing selection record:', existingSelection);
    
    // If there was an error or no selection exists, try to create one
    if ((existingSelectionError && existingSelectionError.code !== 'PGRST116') || !existingSelection) {
      console.log('No selection record found or error occurred, creating one...');
      const { error: createError } = await supabase
        .from("battle_selections")
        .insert({
          battle_id,
          player1_id: battle.challenger_id,
          player2_id: battle.opponent_id,
          player1_card_id: null,
          player2_card_id: null,
          player1_submitted_at: null,
          player2_submitted_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating initial selection record:', createError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to initialize battle selection",
            message: "Could not create battle selection record"
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Prepare the update data - always include both player IDs for consistency
    const currentTime = new Date().toISOString();
    let updateData = {
      battle_id,
      player1_id,
      player2_id,
      updated_at: currentTime
    };

    // Set the appropriate card and timestamp based on which player is selecting
    if (isChallenger) {
      updateData = {
        ...updateData,
        player1_card_id: resolvedCard,
        player1_submitted_at: currentTime
      };
      
      // If this is the first selection, ensure player2 fields are initialized
      if (!existingSelection) {
        updateData = {
          ...updateData,
          player2_card_id: null,
          player2_submitted_at: null
        };
      }
    } else {
      updateData = {
        ...updateData,
        player2_card_id: resolvedCard,
        player2_submitted_at: currentTime
      };
      
      // If this is the first selection, ensure player1 fields are initialized
      if (!existingSelection) {
        updateData = {
          ...updateData,
          player1_card_id: null,
          player1_submitted_at: null
        };
      }
    }

    console.log("Updating battle selection with data:", JSON.stringify(updateData));

    console.log("Upserting battle selection with data:", JSON.stringify(updateData, null, 2));
    
    // First try to update the existing record if it exists
    let { data: selectionData, error: selectionError } = await supabase
      .from("battle_selections")
      .upsert(updateData, {
        onConflict: 'battle_id',
        returning: "minimal"
      });

    // If update failed, try to insert a new record
    if (selectionError) {
      console.warn("Upsert failed, trying direct insert:", selectionError);
      
      // Try to insert a new record with all required fields
      const insertData = {
        ...updateData,
        created_at: currentTime
      };
      
      const { data: insertResult, error: insertError } = await supabase
        .from("battle_selections")
        .insert(insertData)
        .select()
        .single();
        
      if (insertError) {
        console.error("Insert failed:", insertError);
        selectionError = insertError;
      } else {
        selectionData = insertResult;
        selectionError = null;
      }
    }

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
    let battleStatus = "active"; // Default status
    if (updatedSelection?.player1_card_id && updatedSelection?.player2_card_id) {
      console.log("Both players have selected cards. Updating battle status to 'cards_revealed'.");
      
      // Use explicit admin client to update battle status to ensure RLS doesn't block
      const adminClient = createClient(supabaseUrl, supabaseKey);
      
      const { data: updatedBattle, error: updateError } = await adminClient
        .from("battle_instances")
        .update({ status: "cards_revealed" })
        .eq("id", battle_id)
        .select('id, status')
        .single();

      if (updateError) {
        console.error("Error updating battle status:", updateError);
        // Don't return an error response, just log it - the selection was still successful
      } else if (updatedBattle) {
        battleStatus = updatedBattle.status;
        console.log("Battle status successfully updated to:", battleStatus);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Card selection recorded successfully",
        status: battleStatus,
        both_submitted: updatedSelection?.player1_card_id && updatedSelection?.player2_card_id
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
