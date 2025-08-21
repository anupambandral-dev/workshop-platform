import React, { useState, useMemo, useCallback, useEffect, createContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './services/supabase';
import type { AppContextType, Workshop, ManagerUser, SessionWithRecords, Employee, SessionParticipantRecord, Database } from './types';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import JoinSessionPage from './pages/JoinSessionPage';
import LiveSessionPage from './pages/LiveSessionPage';
import WorkshopDetailPage from './pages/WorkshopDetailPage';
import SessionDetailPage from './pages/SessionDetailPage';
import HostAccessPage from './pages/HostAccessPage';
import { LogoIcon } from './components/Icons';

export const AppContext = createContext<AppContextType | null>(null);

const AppContent: React.FC = () => {
    const context = React.useContext(AppContext);
    if (!context) throw new Error("AppContext not found");
    const { user, logout } = context;
    const location = useLocation();

    const isPublicPage = location.pathname.startsWith('/session/') || location.pathname.includes('/host');

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <header className="bg-white shadow-sm">
                <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <Link to={user ? "/dashboard" : "/login"} className="flex items-center space-x-3 cursor-pointer group" aria-label="Go to dashboard">
                            <LogoIcon className="h-8 w-auto text-primary transition-transform group-hover:rotate-12" />
                            <span className="text-xl font-bold text-gray-800 hidden sm:block">Workshop Platform</span>
                        </Link>
                        {user && !isPublicPage && (
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
                    <Route path="/workshop/:workshopId" element={<WorkshopDetailPage />} />
                    <Route path="/workshop/:workshopId/session/:sessionId" element={<SessionDetailPage />} />
                    
                    {/* Public / Semi-public routes */}
                    <Route path="/workshop/:workshopId/host" element={<HostAccessPage />} />
                    <Route path="/session/:sessionId/join" element={<JoinSessionPage />} />
                    <Route path="/session/:sessionId/live" element={<LiveSessionPage />} />

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
    const [user, setUser] = useState<ManagerUser | null>(null);
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchWorkshops = useCallback(async () => {
        setIsLoading(true);
        // Managers fetch all data, public users fetch what RLS allows
        const { data, error } = await supabase
            .from('workshops')
            .select(`*, hosts(*), participants(*), sessions(*, session_participant_records(*))`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching workshops:', error);
            setWorkshops([]);
        } else {
            setWorkshops((data as any) || []);
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
    
    const setupUserSession = useCallback(async (session: any | null) => {
        if (session?.user) {
            const role = session.user.user_metadata?.role;
            if (role === 'manager') {
                 setUser({
                    id: session.user.id,
                    name: session.user.email?.split('@')[0] || 'User',
                    email: session.user.email!,
                    role: 'manager'
                });
                await fetchEmployees();
                await fetchWorkshops();
            } else {
                // Not a manager, log them out of the main app context
                setUser(null);
                setWorkshops([]);
                await fetchEmployees(); 
            }
        } else {
             setUser(null);
             await fetchEmployees(); // Fetch public data
             await fetchWorkshops();
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

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setWorkshops([]);
    };
    
    const addWorkshop = async (workshopData: { title: string; total_sessions: number; weekday: string; time: string }, hosts: Employee[], participants: Employee[]) => {
        if (!user) throw new Error("User must be logged in to create a workshop.");

        try {
            const { data: workshop, error: workshopError } = await supabase
                .from('workshops')
                .insert({ title: workshopData.title, manager_id: user.id })
                .select()
                .single();

            if (workshopError || !workshop) throw new Error(workshopError?.message || "Failed to create workshop.");
            
            const sessionsToCreate: Array<Database['public']['Tables']['sessions']['Insert']> = [];
            let currentDate = new Date();
            const targetWeekday = parseInt(workshopData.weekday, 10);
            
            while (currentDate.getDay() !== targetWeekday) {
                currentDate.setDate(currentDate.getDate() + 1);
            }

            for (let i = 1; i <= workshopData.total_sessions; i++) {
                sessionsToCreate.push({
                    workshop_id: workshop.id, session_number: i, title: `Session ${i}`,
                    date: currentDate.toISOString().split('T')[0], start_time: workshopData.time,
                    end_time: workshopData.time, status: 'scheduled',
                });
                currentDate.setDate(currentDate.getDate() + 7);
            }

            const { data: sessions, error: sessionsError } = await supabase.from('sessions').insert(sessionsToCreate).select();
            if (sessionsError || !sessions) throw new Error(sessionsError?.message || "Failed to create sessions.");

            const hostsToCreate: Array<Database['public']['Tables']['hosts']['Insert']> = hosts.map(h => ({ workshop_id: workshop.id, name: h.name, email: h.email }));
            if (hostsToCreate.length > 0) {
                const { error: hostsError } = await supabase.from('hosts').insert(hostsToCreate);
                if (hostsError) throw new Error(hostsError.message);
            }
            
            const participantsToCreate: Array<Database['public']['Tables']['participants']['Insert']> = participants.map(p => ({ workshop_id: workshop.id, name: p.name, email: p.email }));
            const { data: createdParticipants, error: participantsError } = await supabase.from('participants').insert(participantsToCreate).select();
            if (participantsError || !createdParticipants) throw new Error(participantsError.message);
            
            const recordsToCreate: Array<Database['public']['Tables']['session_participant_records']['Insert']> = [];
            for (const session of sessions) {
                for (const participant of createdParticipants) {
                    recordsToCreate.push({ session_id: session.id, participant_id: participant.id, attendance: 'pending' });
                }
            }
            if (recordsToCreate.length > 0) {
                const { error: recordsError } = await supabase.from('session_participant_records').insert(recordsToCreate);
                if (recordsError) throw new Error(recordsError.message);
            }
            
            await fetchWorkshops();
            
        } catch (error) { console.error("Error in addWorkshop:", error); throw error; }
    };
    
    const updateSession = async (session: SessionWithRecords) => {
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
    };

    const deleteWorkshop = async (workshopId: string) => {
        const { error } = await supabase.from('workshops').delete().eq('id', workshopId);
        if (error) throw error;
        setWorkshops(prev => prev.filter(ws => ws.id !== workshopId));
    };
    
    const updateSessionInState = (updatedSession: SessionWithRecords) => {
        setWorkshops(prev => prev.map(ws => (ws.id === updatedSession.workshop_id) ? { ...ws, sessions: ws.sessions.map(s => s.id === updatedSession.id ? updatedSession : s) } : ws ));
    };
    
    const updateParticipantRecordInState = (updatedRecord: SessionParticipantRecord) => {
        setWorkshops(prev => prev.map(ws => {
            if (ws.sessions.some(s => s.id === updatedRecord.session_id)) {
                return { ...ws, sessions: ws.sessions.map(s => (s.id === updatedRecord.session_id) ? { ...s, session_participant_records: s.session_participant_records.map(r => r.id === updatedRecord.id ? updatedRecord : r) } : s) };
            }
            return ws;
        }));
    };

    const value = useMemo(() => ({
        user, workshops, employees, isLoading,
        logout, addWorkshop, updateSession, deleteWorkshop, updateSessionInState, updateParticipantRecordInState
    }), [user, workshops, employees, isLoading]);

    return (
        <AppContext.Provider value={value}>
            <HashRouter>
                <AppContent />
            </HashRouter>
        </AppContext.Provider>
    );
};

export default App;
