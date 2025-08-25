// supabase/functions/import-employees/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Define the shape of the incoming request body
interface ImportPayload {
  users: { name: string; email: string }[];
}

// Supabase admin client, using the service role key to bypass RLS
let supabaseAdmin: SupabaseClient | null = null;

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: ImportPayload = await req.json();
    const { users } = payload;

    if (!users || !Array.isArray(users)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "users" array in request body.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    if (users.length === 0) {
       return new Response(JSON.stringify({ message: 'No new users to import.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Initialize the Supabase admin client if it hasn't been already
    if (!supabaseAdmin) {
      supabaseAdmin = createClient(
        Deno.env.get('VITE_SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
    }

    // Perform the upsert operation to add new employees and ignore existing ones
    const { error } = await supabaseAdmin
      .from('employees')
      .upsert(users, { onConflict: 'email' });

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }

    return new Response(JSON.stringify({ message: 'Import successful.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
