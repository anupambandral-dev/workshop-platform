import React, { useState, useMemo, useCallback, useEffect, createContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { supabase } from './services/supabase';
import type { AppContextType, Workshop, SessionUser, SessionWithRecords, Participant, Host, Employee } from './types';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import JoinSessionPage from './pages/JoinSessionPage';
import LiveSessionPage from './pages/LiveSessionPage';
import WorkshopDetailPage from './pages/WorkshopDetailPage';
import SessionDetailPage from './pages/SessionDetailPage';
import { LogoIcon } from './components/Icons';

export const AppContext = createContext<AppContextType | null>(null);

const App: React.FC = () => {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchWorkshops = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('workshops')
            .select(`
                *,
                hosts(*),
                participants(*),
                sessions(*, session_participant_records(*))
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching workshops:', error);
            setWorkshops([]);
        } else {
            setWorkshops((data as any[]) || []);
        }
        setIsLoading(false);
    }, []);

    const fetchEmployees = useCallback(async () => {
        const { data, error } = await supabase.from('employees').select('*');
        if (error) {
            console.error('Error fetching employees:', error);
            setEmployees([]);
        } else {
            setEmployees(data || []);
        }
    }, []);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    name: session.user.email?.split('@')[0] || 'Manager',
                    email: session.user.email!,
                    role: 'manager'
                });
                await fetchEmployees(); // Fetch employees for logged-in manager
            }
            // Fetch public workshop data regardless of login state
            await fetchWorkshops();
            setIsLoading(false);
        };
        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                 setUser({
                    id: session.user.id,
                    name: session.user.email?.split('@')[0] || 'Manager',
                    email: session.user.email!,
                    role: 'manager'
                });
                 fetchWorkshops(); // re-fetch workshops
                 fetchEmployees(); // fetch employees
            }
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setEmployees([]); // Clear employee data on logout
                 fetchWorkshops(); // re-fetch public data
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [fetchWorkshops, fetchEmployees]);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
    }, []);

    const addWorkshop = useCallback(async (
        workshopData: { title: string; total_sessions: number; weekday: string; time: string },
        newHosts: Omit<Host, 'id' | 'workshop_id'>[],
        newParticipants: Omit<Participant, 'id' | 'workshop_id'>[]
    ) => {
        if (!user) throw new Error("User must be logged in to create a workshop.");

        // 1. Create Workshop
        const { data: workshop, error: workshopError } = await supabase
            .from('workshops')
            .insert({ title: workshopData.title, manager_id: user.id })
            .select()
            .single();
        if (workshopError) throw workshopError;
        if (!workshop) throw new Error("Workshop creation failed.");

        const workshopId = workshop.id;

        // 2. Add Hosts & Participants
        const hostsToInsert = newHosts.map(h => ({ ...h, workshop_id: workshopId }));
        const participantsToInsert = newParticipants.map(p => ({ ...p, workshop_id: workshopId }));

        const [{ error: hostError }, { data: participants, error: participantError }] = await Promise.all([
             supabase.from('hosts').insert(hostsToInsert),
             supabase.from('participants').insert(participantsToInsert).select()
        ]);

        if (hostError) throw hostError;
        if (participantError) throw participantError;
        if (!participants) throw new Error("Failed to add participants.");

        // 3. Generate and Add Sessions
        const getNextDayOfWeek = (dayOfWeek: number): Date => {
            const date = new Date();
            date.setDate(date.getDate() + (dayOfWeek + 7 - date.getDay()) % 7);
            if (date.getDay() === new Date().getDay() && date < new Date()) {
                date.setDate(date.getDate() + 7);
            }
            return date;
        };

        const sessionsToInsert = [];
        const dayOfWeek = parseInt(workshopData.weekday, 10);
        let currentSessionDate = getNextDayOfWeek(dayOfWeek);
        
        for (let i = 1; i <= workshopData.total_sessions; i++) {
            sessionsToInsert.push({
                workshop_id: workshopId,
                session_number: i,
                title: `Session ${i}`,
                date: currentSessionDate.toISOString().split('T')[0],
                start_time: workshopData.time,
                end_time: '17:00', // Placeholder
                status: 'scheduled' as const,
            });
            currentSessionDate.setDate(currentSessionDate.getDate() + 7);
        }
        
        const { data: sessions, error: sessionError } = await supabase.from('sessions').insert(sessionsToInsert).select();
        if (sessionError) throw sessionError;
        if (!sessions) throw new Error("Failed to create sessions.");

        // 4. Create participant records for each session
        const participantRecordsToInsert = [];
        for (const session of sessions) {
            for (const participant of participants) {
                participantRecordsToInsert.push({
                    session_id: session.id,
                    participant_id: participant.id,
                    attendance: 'pending' as const,
                    feedback: null,
                });
            }
        }
        const { error: recordsError } = await supabase.from('session_participant_records').insert(participantRecordsToInsert);
        if (recordsError) throw recordsError;

        await fetchWorkshops(); // Refresh data
    }, [user, fetchWorkshops]);
    
    const updateSession = useCallback(async (updatedSession: SessionWithRecords) => {
        const { id, title, date, start_time, end_time, status, host_reflection } = updatedSession;
        const { error: sessionUpdateError } = await supabase
            .from('sessions')
            .update({ title, date, start_time, end_time, status, host_reflection })
            .eq('id', id);

        if (sessionUpdateError) throw sessionUpdateError;

        for (const record of updatedSession.session_participant_records) {
             const { id: recordId, attendance, feedback } = record;
             const { error: recordUpdateError } = await supabase
                .from('session_participant_records')
                .update({ attendance, feedback })
                .eq('id', recordId);
            if (recordUpdateError) console.error("Error updating record:", recordUpdateError);
        }

        setWorkshops(prevWorkshops => {
            return prevWorkshops.map(ws => {
                const sessionIndex = ws.sessions.findIndex(s => s.id === updatedSession.id);
                if (sessionIndex > -1) {
                    const newSessions = [...ws.sessions];
                    newSessions[sessionIndex] = updatedSession;
                    return { ...ws, sessions: newSessions };
                }
                return ws;
            });
        });
    }, []);

    const appContextValue = useMemo(() => ({
        user,
        workshops,
        employees,
        isLoading,
        logout,
        addWorkshop,
        updateSession,
    }), [user, workshops, employees, isLoading, logout, addWorkshop, updateSession]);

    const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        if (isLoading) return <div className="p-10 text-center">Loading...</div>;
        if (!user) {
            return <Navigate to="/login" replace />;
        }
        return <>{children}</>;
    };

    return (
        <AppContext.Provider value={appContextValue}>
            <HashRouter>
                <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
                    <header className="bg-white shadow-sm">
                        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center py-4">
                                <Link to={user ? "/dashboard" : "/login"} className="flex items-center space-x-3 cursor-pointer group" aria-label="Go to dashboard">
                                    <LogoIcon className="h-8 w-auto text-primary transition-transform group-hover:rotate-12" />
                                    <span className="text-xl font-bold text-gray-800 hidden sm:block">Workshop Platform</span>
                                </Link>
                                {user && (
                                    <button
                                        onClick={logout}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                    >
                                        Logout
                                    </button>
                                )}
                            </div>
                        </nav>
                    </header>
                    <main>
                        <Routes>
                            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
                            
                            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
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
            </HashRouter>
        </AppContext.Provider>
    );
};

export default App;
