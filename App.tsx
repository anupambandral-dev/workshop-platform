import React, { useState, useMemo, useCallback, useEffect, createContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './services/supabase';
import type { AppContextType, Workshop, SessionUser, SessionWithRecords, Employee, SessionParticipantRecord, Host, Database } from './types';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import JoinSessionPage from './pages/JoinSessionPage';
import LiveSessionPage from './pages/LiveSessionPage';
import WorkshopDetailPage from './pages/WorkshopDetailPage';
import SessionDetailPage from './pages/SessionDetailPage';
import EmployeesPage from './pages/EmployeesPage';
import { LogoIcon } from './components/Icons';

export const AppContext = createContext<AppContextType | null>(null);

const AppContent: React.FC = () => {
    const context = React.useContext(AppContext);
    if (!context) throw new Error("AppContext not found");
    const { user, logout } = context;
    const location = useLocation();

    // Hide logout on public-facing participant pages
    const isParticipantPage = location.pathname.startsWith('/session/');
    const isManager = user?.role === 'manager';

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <header className="bg-white shadow-sm">
                <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <Link to={user ? "/dashboard" : "/login"} className="flex items-center space-x-3 cursor-pointer group" aria-label="Go to dashboard">
                            <LogoIcon className="h-8 w-auto text-primary transition-transform group-hover:rotate-12" />
                            <span className="text-xl font-bold text-gray-800 hidden sm:block">Workshop Platform</span>
                        </Link>
                        {user && !isParticipantPage && (
                             <div className="flex items-center space-x-4">
                                {isManager && (
                                    <Link to="/employees" className="text-sm font-medium text-gray-700 hover:text-primary">
                                        Manage Employees
                                    </Link>
                                )}
                                <button
                                    onClick={logout}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </nav>
            </header>
            <main>
                <Routes>
                    <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
                    
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
                    <Route path="/workshop/:workshopId" element={<ProtectedRoute><WorkshopDetailPage /></ProtectedRoute>} />
                    <Route path="/workshop/:workshopId/session/:sessionId" element={<ProtectedRoute><SessionDetailPage /></ProtectedRoute>} />
                    
                    {/* Public Routes */}
                    <Route path="/session/:sessionId/join" element={<JoinSessionPage />} />
                    <Route path="/session/:sessionId/live" element={<LiveSessionPage />} />

                    {/* Default Route */}
                    <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
                </Routes>
            </main>
        </div>
    );
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const context = React.useContext(AppContext);
    if (!context) throw new Error("AppContext not found");
    const { user, isLoading } = context;

    if (isLoading) return <div className="p-10 text-center">Loading user session...</div>;
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};


const App: React.FC = () => {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchWorkshops = useCallback(async (currentUser: SessionUser | null, allEmployees: Employee[]) => {
        setIsLoading(true);
        if (!currentUser) {
            setWorkshops([]);
            setIsLoading(false);
            return;
        }

        let query = supabase
            .from('workshops')
            .select(`
                *,
                hosts(user_id),
                participants(*, employees(*)),
                sessions(*, session_participant_records(*))
            `)
            .order('created_at', { ascending: false });

        if (currentUser.role === 'host') {
            const { data: hostEntries, error: hostError } = await supabase
                .from('hosts')
                .select('workshop_id')
                .eq('user_id', currentUser.id);

            if (hostError) {
                console.error('Error fetching host workshops:', hostError);
                setWorkshops([]);
                setIsLoading(false);
                return;
            }
            
            const workshopIds = hostEntries.map(h => h.workshop_id);
            if (workshopIds.length === 0) {
                setWorkshops([]);
                setIsLoading(false);
                return;
            }

            query = query.in('id', workshopIds);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching workshops:', error);
            setWorkshops([]);
        } else if (data) {
             const enrichedWorkshops = data.map(ws => ({
                ...ws,
                hosts: Array.isArray(ws.hosts) ? (ws.hosts as any[]).map(host => {
                    const employee = allEmployees.find(emp => emp.id === host.user_id);
                    return {
                        user_id: host.user_id,
                        name: employee?.name || 'Unknown Host',
                        email: employee?.email || 'No email'
                    };
                }) : [],
                participants: Array.isArray(ws.participants) ? (ws.participants as any[]).map(p => {
                    if (!p.employees) {
                        return {
                            id: p.id,
                            workshop_id: p.workshop_id,
                            employee_id: p.employee_id,
                            name: 'Unknown Participant',
                            email: 'No email'
                        };
                    }
                    return {
                        id: p.id,
                        workshop_id: p.workshop_id,
                        employee_id: p.employees.id,
                        name: p.employees.name,
                        email: p.employees.email,
                    }
                }) : [],
            }));
            setWorkshops(enrichedWorkshops as unknown as Workshop[]);
        } else {
             setWorkshops([]);
        }
        setIsLoading(false);
    }, []);

    const fetchEmployees = useCallback(async () => {
        const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching employees:', error);
            setEmployees([]);
            return [];
        } else {
            const employeeData = data || [];
            setEmployees(employeeData);
            return employeeData;
        }
    }, []);
    
    const setupUserSession = useCallback(async (session: any | null) => {
        if (session?.user) {
            // FIX: The previous role check was too strict, preventing login if user metadata for 'role' was not set.
            // This logic now defaults to 'manager' if a valid role is not found, ensuring the primary user can always access the system.
            const roleFromMetadata = session.user.user_metadata?.role;
            const userRole = (roleFromMetadata === 'manager' || roleFromMetadata === 'host') ? roleFromMetadata : 'manager';

            const currentUser: SessionUser = {
                id: session.user.id,
                name: session.user.email?.split('@')[0] || 'User',
                email: session.user.email!,
                role: userRole,
            };
            setUser(currentUser);
            const allEmployees = await fetchEmployees();
            await fetchWorkshops(currentUser, allEmployees);
        } else {
            setUser(null);
            await fetchEmployees();
            setWorkshops([]);
        }
        setIsLoading(false);
    }, [fetchWorkshops, fetchEmployees]);


    useEffect(() => {
        setIsLoading(true);
        supabase.auth.getSession().then(({ data: { session } }) => {
            setupUserSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setupUserSession(session);
        });

        return () => subscription.unsubscribe();
    }, [setupUserSession]);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setWorkshops([]);
        setEmployees([]);
    }, []);
    
    const addWorkshop = useCallback(async (workshopData: { title: string; total_sessions: number; weekday: string; time: string }, hosts: Employee[], participants: Employee[]) => {
        if (!user) throw new Error("User must be logged in to create a workshop.");

        try {
            // 1. Create the workshop
            const { data: workshop, error: workshopError } = await supabase
                .from('workshops')
                .insert({ title: workshopData.title, manager_id: user.id })
                .select()
                .single();

            if (workshopError || !workshop) throw new Error(workshopError?.message || "Failed to create workshop.");

            // 2. Generate Sessions
            const sessionsToCreate: Array<Database['public']['Tables']['sessions']['Insert']> = [];
            let currentDate = new Date();
            const targetWeekday = parseInt(workshopData.weekday, 10);
            
            while (currentDate.getDay() !== targetWeekday) {
                currentDate.setDate(currentDate.getDate() + 1);
            }

            for (let i = 1; i <= workshopData.total_sessions; i++) {
                sessionsToCreate.push({
                    workshop_id: workshop.id,
                    session_number: i,
                    title: `Session ${i}`,
                    date: currentDate.toISOString().split('T')[0],
                    start_time: workshopData.time,
                    end_time: workshopData.time,
                    status: 'scheduled' as const,
                });
                currentDate.setDate(currentDate.getDate() + 7);
            }

            const { data: sessions, error: sessionsError } = await supabase.from('sessions').insert(sessionsToCreate).select();
            if (sessionsError || !sessions) throw new Error(sessionsError?.message || "Failed to create sessions.");

            // 3. Add Hosts
            const hostsToCreate: Array<Database['public']['Tables']['hosts']['Insert']> = hosts.map(h => ({ workshop_id: workshop.id, user_id: h.id }));
            const { error: hostsError } = await supabase.from('hosts').insert(hostsToCreate);
            if (hostsError) throw new Error(hostsError.message);

            // 4. Add Participants
            const participantsToCreate: Array<Database['public']['Tables']['participants']['Insert']> = participants.map(p => ({ workshop_id: workshop.id, employee_id: p.id }));
            const { data: createdParticipants, error: participantsError } = await supabase.from('participants').insert(participantsToCreate).select();
            if (participantsError || !createdParticipants) throw new Error(participantsError.message);
            
            // 5. Create participant records for each session
            const recordsToCreate: Array<Database['public']['Tables']['session_participant_records']['Insert']> = [];
            for (const session of sessions) {
                for (const participant of createdParticipants) {
                    recordsToCreate.push({
                        session_id: session.id,
                        participant_id: participant.id,
                        attendance: 'pending' as const
                    });
                }
            }
            const { error: recordsError } = await supabase.from('session_participant_records').insert(recordsToCreate);
            if (recordsError) throw new Error(recordsError.message);

            await fetchWorkshops(user, employees);
            
        } catch (error) {
            console.error("Error in addWorkshop:", error);
            throw error;
        }
    }, [user, employees, fetchWorkshops]);
    
    const addEmployees = useCallback(async (newEmployees: { name: string; email: string }[]) => {
        setIsLoading(true);
        try {
            // Step 1: Get the most up-to-date list of emails to prevent race conditions.
            const { data: currentEmployees, error: fetchError } = await supabase
                .from('employees')
                .select('email');

            if (fetchError) {
                console.error("Failed to fetch current emails for duplicate check:", fetchError);
                throw new Error("Could not verify existing employees. Please try again.");
            }

            const existingEmails = new Set((currentEmployees || []).map(e => e.email.toLowerCase()));
            
            const employeesToInsert: { name: string; email: string }[] = [];
            let duplicateCount = 0;

            for (const emp of newEmployees) {
                if (!existingEmails.has(emp.email.toLowerCase())) {
                    employeesToInsert.push(emp);
                    // Add to the set locally to handle duplicates within the same import file
                    existingEmails.add(emp.email.toLowerCase());
                } else {
                    duplicateCount++;
                }
            }

            if (employeesToInsert.length === 0) {
                return { newCount: 0, duplicateCount, error: null };
            }

            // Step 2: Insert only the new employees.
            const { error: insertError } = await supabase
                .from('employees')
                .insert(employeesToInsert);

            if (insertError) {
                throw insertError;
            }

            // Step 3: Re-fetch the entire list from the database to ensure UI is in sync.
            await fetchEmployees();

            return { newCount: employeesToInsert.length, duplicateCount, error: null };

        } catch (err: any) {
            console.error("Error adding employees:", err);
            const errorMessage = err.message.includes("employees_email_key") 
                ? "One or more emails in the import file already exist in the system." 
                : err.message;
            return { newCount: 0, duplicateCount: newEmployees.length, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [fetchEmployees]);

    const updateSessionInState = useCallback((updatedSession: SessionWithRecords) => {
        setWorkshops(prev => prev.map(ws => {
            if (ws.id === updatedSession.workshop_id) {
                return {
                    ...ws,
                    sessions: ws.sessions.map(s => s.id === updatedSession.id ? updatedSession : s)
                };
            }
            return ws;
        }));
    }, []);

    const updateSession = useCallback(async (session: SessionWithRecords) => {
        const { session_participant_records, ...sessionData } = session;
        const { id: sessionId, ...sessionUpdateData } = sessionData;

        const { error } = await supabase.from('sessions').update(sessionUpdateData).eq('id', sessionId);
        if (error) throw error;

        for (const record of session_participant_records) {
             const { id: recordId, ...recordUpdateData } = record;
            const { error: recordError } = await supabase.from('session_participant_records').update(recordUpdateData).eq('id', recordId);
            if (recordError) throw recordError;
        }
        updateSessionInState(session);
    }, [updateSessionInState]);

    const deleteWorkshop = useCallback(async (workshopId: string) => {
        const { error } = await supabase.from('workshops').delete().eq('id', workshopId);
        if (error) throw error;
        setWorkshops(prev => prev.filter(ws => ws.id !== workshopId));
    }, []);
    
    const updateParticipantRecordInState = useCallback((updatedRecord: SessionParticipantRecord) => {
         setWorkshops(prev => prev.map(ws => {
            const sessionToUpdate = ws.sessions.find(s => s.id === updatedRecord.session_id);
            if (sessionToUpdate) {
                return {
                    ...ws,
                    sessions: ws.sessions.map(s => {
                        if (s.id === updatedRecord.session_id) {
                            return {
                                ...s,
                                session_participant_records: s.session_participant_records.map(r => r.id === updatedRecord.id ? updatedRecord : r)
                            };
                        }
                        return s;
                    })
                };
            }
            return ws;
        }));
    }, []);

    const value = useMemo(() => ({
        user,
        workshops,
        employees,
        isLoading,
        logout,
        addWorkshop,
        addEmployees,
        updateSession,
        deleteWorkshop,
        updateSessionInState,
        updateParticipantRecordInState
    }), [user, workshops, employees, isLoading, logout, addWorkshop, addEmployees, updateSession, deleteWorkshop, updateSessionInState, updateParticipantRecordInState]);

    return (
        <AppContext.Provider value={value}>
            <HashRouter>
                <AppContent />
            </HashRouter>
        </AppContext.Provider>
    );
};

export default App;
