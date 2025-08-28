// Add a declaration for the Deno global to satisfy TypeScript in non-Deno environments.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers directly in the function to avoid import issues in the Supabase UI.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the shape of the incoming request body
interface ImportPayload {
  users: { name: string; email: string }[];
}

console.log('Spawning "import-employees" function...');

serve(async (req: Request) => {
  // 1. Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Check for required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Function is missing required environment variables.');
        return new Response(
            JSON.stringify({ error: 'Server configuration error: The function is missing required environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY). Please configure these in your Supabase project settings.' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        );
    }
    
    // 3. Initialize Supabase Admin Client for this request
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 4. Parse incoming request body
    const payload: ImportPayload = await req.json();
    const { users } = payload;

    if (!users || !Array.isArray(users)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "users" array in request body.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    if (users.length === 0) {
       console.log('Received empty users array. Nothing to import.');
       return new Response(JSON.stringify({ message: 'No new users to import.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Attempting to upsert ${users.length} users.`);

    // 5. Perform the upsert operation. This requires a UNIQUE constraint on the 'email' column.
    const { error } = await supabaseAdmin
      .from('employees')
      .upsert(users, { onConflict: 'email' }); 

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error; // Let the catch block handle detailed error analysis
    }

    console.log(`Successfully processed ${users.length} users.`);

    // 6. Return success response
    return new Response(JSON.stringify({ message: 'Import successful.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error('An unexpected error occurred in the function:', err);

    let errorMessage = err.message || 'An unknown server error occurred.';
    let status = 500;

    // Self-diagnose: Check for the most common database configuration error.
    if (err.message && (err.message.toLowerCase().includes('on conflict') || err.message.toLowerCase().includes('constraint'))) {
        errorMessage = 'Database configuration error: The import feature requires a UNIQUE constraint on the "email" column in your "employees" table. Please add this constraint in the Supabase Table Editor to resolve this issue.';
        status = 400; // Bad Request, as it's a client-side (schema) configuration issue
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
});
