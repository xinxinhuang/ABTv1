// deno-lint-ignore-file
// @ts-nocheck

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, User } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, origin, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const { user_ids } = await req.json()

    if (!user_ids || !Array.isArray(user_ids)) {
      return new Response(JSON.stringify({ error: 'user_ids must be an array.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Use the Service Role Key to query the auth.users table
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100, // Assuming we won't have more than 100 challenges at once
    });

    if (error) {
      throw error;
    }

    // Filter the users to get only the ones we need and map to a simpler object
    const userMap = users.users
      .filter((user: User) => user_ids.includes(user.id))
      .reduce((acc: Record<string, { email: string | undefined }>, user: User) => {
        acc[user.id] = { email: user.email };
        return acc;
      }, {});

    return new Response(JSON.stringify(userMap), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    const error = e as Error;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
