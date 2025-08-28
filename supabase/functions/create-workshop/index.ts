// Add a declaration for the Deno global to satisfy TypeScript in non-Deno environments.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateWorkshopPayload {
  workshopData: {
    title: string;
    total_sessions: number;
    weekday: string;
    time: string;
  };
  hostIds: string[];
  participantIds: string[];
}

// Helper to get the Auth user from the request
const getAuthUser = async (req: Request, supabaseClient: SupabaseClient) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        throw new Error('Missing Authorization header');
    }
    const { data: { user }, error } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (error || !user) {
        throw new Error('Invalid JWT');
    }
    return user;
};


console.log('Spawning "create-workshop" function...');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Initialize Clients and Get User
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Server configuration error: Missing required environment variables.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const user = await getAuthUser(req, supabaseAdmin);
    
    // 2. Parse payload
    const { workshopData, hostIds, participantIds }: CreateWorkshopPayload = await req.json();

    // --- Start Transaction-like block ---
    
    // Step 1: Create the workshop
    const { data: workshop, error: workshopError } = await supabaseAdmin
      .from('workshops')
      .insert({ title: workshopData.title, manager_id: user.id })
      .select()
      .single();
    if (workshopError) throw workshopError;

    // Step 2: Generate Sessions
    const sessionsToCreate: any[] = [];
    let currentDate = new Date();
    const targetWeekday = parseInt(workshopData.weekday, 10);
    // Find the next occurrence of the target weekday
    while (currentDate.getDay() !== targetWeekday) {
        currentDate.setDate(currentDate.getDate() + 1);
    }
    for (let i = 1; i <= workshopData.total_sessions; i++) {
        const [hours, minutes] = workshopData.time.split(':').map(Number);
        const endHours = hours + 1;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        sessionsToCreate.push({
            workshop_id: workshop.id,
            session_number: i,
            title: `Session ${i}`,
            date: currentDate.toISOString().split('T')[0],
            start_time: workshopData.time,
            end_time: endTime,
            status: 'scheduled',
        });
        currentDate.setDate(currentDate.getDate() + 7); // Move to the same day next week
    }
    const { data: sessions, error: sessionsError } = await supabaseAdmin.from('sessions').insert(sessionsToCreate).select();
    if (sessionsError) throw sessionsError;

    // Step 3: Add Hosts directly using their Employee IDs.
    // This now correctly uses the 'employee_id' column after the database fix.
    const hostsToCreate = hostIds.map(employeeId => ({ workshop_id: workshop.id, employee_id: employeeId }));
    const { error: hostsError } = await supabaseAdmin.from('hosts').insert(hostsToCreate);
    if (hostsError) {
        console.error('Error inserting hosts:', hostsError.message);
        throw new Error(`Database error: Failed to link hosts to workshop. This confirms a schema mismatch. Please ensure you have run the provided SQL fix. Details: ${hostsError.message}`);
    }
    
    // Step 4: Add Participants
    const participantsToCreate = participantIds.map(id => ({ workshop_id: workshop.id, employee_id: id }));
    const { data: createdParticipants, error: participantsError } = await supabaseAdmin.from('participants').insert(participantsToCreate).select();
    if (participantsError) throw participantsError;

    // Step 5: Create attendance records for each session
    const recordsToCreate: any[] = [];
    for (const session of sessions) {
        for (const participant of createdParticipants) {
            recordsToCreate.push({
                session_id: session.id,
                participant_id: participant.id,
                attendance: 'pending',
            });
        }
    }
    const { error: recordsError } = await supabaseAdmin.from('session_participant_records').insert(recordsToCreate);
    if (recordsError) throw recordsError;

    // --- End Transaction-like block ---

    // 6. Fetch the complete, enriched workshop to return to the client
    const { data: finalWorkshop, error: finalError } = await supabaseAdmin
        .from('workshops')
        .select(`
            *,
            hosts(employee_id),
            participants(*, employees(*)),
            sessions(*, session_participant_records(*))
        `)
        .eq('id', workshop.id)
        .single();
        
    if (finalError) throw finalError;
    
    // 7. Manually enrich hosts with employee data
    const { data: hostEmployees, error: hostEmployeesError } = await supabaseAdmin
        .from('employees')
        .select('id, name, email')
        .in('id', hostIds);

    if (hostEmployeesError) throw hostEmployeesError;

    const enrichedHosts = (finalWorkshop.hosts as any[]).map(h => {
        const employeeData = hostEmployees.find(emp => emp.id === h.employee_id);
        return {
            employee_id: h.employee_id,
            name: employeeData?.name || 'Unknown Host',
            email: employeeData?.email || 'No email',
        };
    });
    
    const enrichedParticipants = (finalWorkshop.participants as any[]).map(p => ({
        id: p.id,
        workshop_id: p.workshop_id,
        employee_id: p.employees.id,
        name: p.employees.name,
        email: p.employees.email,
    }));

    const responsePayload = {
        ...finalWorkshop,
        hosts: enrichedHosts,
        participants: enrichedParticipants
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error('An unexpected error occurred in the function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
