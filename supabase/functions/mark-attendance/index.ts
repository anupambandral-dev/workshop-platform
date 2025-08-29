// supabase/functions/mark-attendance/index.ts

// Add a declaration for the Deno global to satisfy TypeScript in non-Deno environments.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarkAttendancePayload {
  sessionId: string;
  email: string;
}

console.log('Spawning "mark-attendance" function...');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Server configuration error: Missing required environment variables.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { sessionId, email }: MarkAttendancePayload = await req.json();

    if (!sessionId || !email) {
      return new Response(JSON.stringify({ error: 'Missing sessionId or email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    console.log(`[mark-attendance] Received request for session: ${sessionId}, email: ${email}`);

    console.log('[mark-attendance] Step 1: Finding session to get workshop_id...');
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('workshop_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      console.error(`[mark-attendance] Step 1 FAILED: Session not found for id: ${sessionId}`, sessionError);
      throw new Error('Session not found.');
    }
    const { workshop_id } = sessionData;
    console.log(`[mark-attendance] Step 1 SUCCESS: Found workshop_id: ${workshop_id}`);

    console.log('[mark-attendance] Step 2: Finding participant record...');
    const { data: participantData, error: participantError } = await supabaseAdmin
      .from('participants')
      .select('id')
      .eq('workshop_id', workshop_id)
      .ilike('email', email) // Use case-insensitive search
      .single();

    if (participantError || !participantData) {
      console.error(`[mark-attendance] Step 2 FAILED: Participant not found for email: ${email} in workshop: ${workshop_id}`, participantError);
      throw new Error('Participant not registered for this workshop.');
    }
    const { id: participant_id } = participantData;
    console.log(`[mark-attendance] Step 2 SUCCESS: Found participant_id: ${participant_id}`);

    console.log('[mark-attendance] Step 3: Updating attendance record...');
    const { error: updateError } = await supabaseAdmin
      .from('session_participant_records')
      .update({ attendance: 'present' })
      .eq('session_id', sessionId)
      .eq('participant_id', participant_id);

    if (updateError) {
      console.error('[mark-attendance] Step 3 FAILED: Could not update attendance record:', updateError);
      throw new Error('Failed to update attendance record.');
    }
    console.log(`[mark-attendance] Step 3 SUCCESS: Marked attendance for ${email} in session ${sessionId}`);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error('[mark-attendance] An unexpected error occurred:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});