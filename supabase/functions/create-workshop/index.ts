// Add a declaration for the Deno global to satisfy TypeScript in non-Deno environments.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers directly to avoid import issues in the Supabase UI.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkshopPayload {
  title: string;
  total_sessions: number;
  weekday: string;
  time: string;
  hosts: string[];
  participants: string[];
}

console.log('Spawning "create-workshop" function...');

serve(async (req: Request) => {
  // 1. Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Check for required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
        console.error('Function is missing required environment variables.');
        return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
    
    // 3. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // 4. Create a user-context client to identify the manager making the request
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUserClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseUserClient.auth.getUser();

    if (!user) {
        return new Response(JSON.stringify({ error: 'User not authenticated.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        });
    }

    // 5. Parse incoming request body
    const payload: WorkshopPayload = await req.json();
    const { title, total_sessions, weekday, time, hosts, participants } = payload;
    
    // --- Start DB Operations (as a single transaction-like block) ---

    // a. CRITICAL FIX: Ensure manager exists in employees table to satisfy FK constraint.
    //    This is the robust, server-side solution to the workshop creation failures.
    const { error: upsertError } = await supabaseAdmin
        .from('employees')
        .upsert({
            id: user.id,
            email: user.email!,
            name: user.email!.split('@')[0]
        }, { onConflict: 'id' });
    
    if (upsertError) {
        console.error("Critical error: Failed to upsert manager into employees table.", upsertError);
        throw upsertError;
    }

    // b. Create the workshop
    const { data: workshop, error: workshopError } = await supabaseAdmin
      .from('workshops')
      .insert({ title, manager_id: user.id })
      .select()
      .single();
    if (workshopError) throw workshopError;

    // c. Calculate and create sessions
    const sessionsToInsert = [];
    const today = new Date();
    const targetWeekday = parseInt(weekday, 10);
    const [hours, minutes] = time.split(':').map(Number);
    let firstSessionDate = new Date();
    firstSessionDate.setHours(0, 0, 0, 0);

    const currentDay = today.getDay();
    let dayDifference = targetWeekday - currentDay;
    if (dayDifference < 0) {
        dayDifference += 7;
    }
    firstSessionDate.setDate(today.getDate() + dayDifference);

    if (dayDifference === 0) {
        const sessionTimeToday = new Date();
        sessionTimeToday.setHours(hours, minutes, 0, 0);
        if (sessionTimeToday < new Date()) {
            firstSessionDate.setDate(firstSessionDate.getDate() + 7);
        }
    }

    for (let i = 0; i < total_sessions; i++) {
        const sessionDate = new Date(firstSessionDate);
        sessionDate.setDate(firstSessionDate.getDate() + i * 7);

        const startTimeMinutes = hours * 60 + minutes;
        const endTimeMinutes = startTimeMinutes + 60; // 1-hour duration
        const endHours = Math.floor(endTimeMinutes / 60) % 24;
        const endMinutes = endTimeMinutes % 60;

        sessionsToInsert.push({
            workshop_id: workshop.id,
            session_number: i + 1,
            title: `Session ${i + 1}`,
            date: sessionDate.toISOString().split('T')[0],
            start_time: time,
            end_time: `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`,
            status: 'scheduled',
        });
    }

    const { data: createdSessions, error: sessionsError } = await supabaseAdmin
        .from('sessions')
        .insert(sessionsToInsert)
        .select();
    if (sessionsError) throw sessionsError;

    // d. Create hosts
    if (hosts && hosts.length > 0) {
        const hostsToInsert = hosts.map(hostId => ({
            workshop_id: workshop.id,
            user_id: hostId,
        }));
        const { error: hostsError } = await supabaseAdmin.from('hosts').insert(hostsToInsert);
        if (hostsError) throw hostsError;
    }

    // e. Create participants and their session records
    if (participants && participants.length > 0) {
        const participantsToInsert = participants.map(participantId => ({
            workshop_id: workshop.id,
            employee_id: participantId,
        }));
        const { data: createdParticipants, error: participantsError } = await supabaseAdmin
            .from('participants')
            .insert(participantsToInsert)
            .select();
        if (participantsError) throw participantsError;

        if (createdParticipants && createdParticipants.length > 0) {
            const recordsToInsert = [];
            for (const session of createdSessions) {
                for (const participant of createdParticipants) {
                    recordsToInsert.push({
                        session_id: session.id,
                        participant_id: participant.id,
                        attendance: 'pending',
                    });
                }
            }
            if (recordsToInsert.length > 0) {
                const { error: recordsError } = await supabaseAdmin.from('session_participant_records').insert(recordsToInsert);
                if (recordsError) throw recordsError;
            }
        }
    }

    // 6. Fetch and return the newly created workshop object with all its relations
    const { data: newWorkshop, error: fetchError } = await supabaseAdmin
      .from('workshops')
      .select(`
        *,
        hosts ( user_id ),
        participants ( id, employee_id ),
        sessions ( *, session_participant_records ( * ) )
      `)
      .eq('id', workshop.id)
      .single();

    if (fetchError) {
        console.error("Error fetching the new workshop after creation:", fetchError);
        throw fetchError;
    }

    return new Response(JSON.stringify(newWorkshop), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error('An unexpected error occurred in the function:', err);
    return new Response(JSON.stringify({ error: err.message || 'An unknown server error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
