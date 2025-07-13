// deno-lint-ignore-file
// @ts-nocheck

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user from the request
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Collect battle data from all possible tables
    const results = {};
    
    // Try battle_instances
    const { data: battleInstances, error: battleInstancesError } = await supabaseClient
      .from('battle_instances')
      .select('*')
      .limit(20);
    
    results.battle_instances = {
      data: battleInstances || [],
      error: battleInstancesError ? battleInstancesError.message : null
    };
    
    // Try battle_lobbies
    const { data: battleLobbies, error: battleLobbiesError } = await supabaseClient
      .from('battle_lobbies')
      .select('*')
      .limit(20);
    
    results.battle_lobbies = {
      data: battleLobbies || [],
      error: battleLobbiesError ? battleLobbiesError.message : null
    };
    
    // Try battles
    const { data: battles, error: battlesError } = await supabaseClient
      .from('battles')
      .select('*')
      .limit(20);
    
    results.battles = {
      data: battles || [],
      error: battlesError ? battlesError.message : null
    };
    
    // Get all tables in the database for reference
    const { data: tables, error: tablesError } = await supabaseClient
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    results.available_tables = {
      data: tables ? tables.map(t => t.tablename) : [],
      error: tablesError ? tablesError.message : null
    };
    
    // Check for user's battles specifically
    const { data: userBattles, error: userBattlesError } = await supabaseClient
      .from('battle_instances')
      .select('*')
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .limit(20);
    
    results.user_battles = {
      data: userBattles || [],
      error: userBattlesError ? userBattlesError.message : null
    };

    return new Response(
      JSON.stringify(results),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
