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
import HostLoginPage from './pages/HostLoginPage';
import { LogoIcon } from './components/Icons';

export const AppContext = createContext<AppContextType | null>(null);

const AppContent: React.FC = () => {
    const context = React.useContext(AppContext);
    if (!context) throw new Error("AppContext not found");
    const { user, logout } = context;
    const location = useLocation();

    // Hide logout on public-facing participant and host pages
    const isPublicPage = location.pathname.startsWith('/session/') || location.pathname.startsWith('/host/');
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
                        {user && !isPublicPage && (
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
                    {/* Manager Routes */}
                    <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
                    <Route path="/workshop/:workshopId" element={<ProtectedRoute><WorkshopDetailPage /></ProtectedRoute>} />
                    
                    {/* Shared manager/host route */}
                    <Route path="/workshop/:workshopId/session/:sessionId" element={<SessionDetailPage />} />

                    {/* Public Routes for Hosts & Participants */}
                    <Route path="/host/session/:sessionId/login" element={<HostLoginPage />} />
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

    // Re-architected data fetching logic
    const fetchAllData = useCallback(async () => {
        setIsLoading(true);

        const fetchEmployees = supabase.from('employees').select('*').order('created_at', { ascending: false });
        const fetchWorkshops = supabase
            .from('workshops')
            .select(`
                *,
                hosts(employee_id),
                participants(*, employees(*)),
                sessions(*, session_participant_records(*))
            `)
            .order('created_at', { ascending: false });

        const [employeesResult, workshopsResult] = await Promise.all([fetchEmployees, fetchWorkshops]);

        const allEmployees = employeesResult.data || [];
        setEmployees(allEmployees);

        if (workshopsResult.error) {
            console.error('Error fetching workshops:', workshopsResult.error);
            setWorkshops([]);
        } else if (workshopsResult.data) {
             const enrichedWorkshops = workshopsResult.data.map(ws => ({
                ...ws,
                hosts: (Array.isArray(ws.hosts) ? ws.hosts : []).map((host: any) => {
                    const employee = allEmployees.find(emp => emp.id === host.employee_id);
                    return {
                        employee_id: host.employee_id,
                        name: employee?.name || 'Unknown Host',
                        email: employee?.email || 'No email'
                    };
                }),
                participants: (Array.isArray(ws.participants) ? ws.participants : []).map((p: any) => {
                    if (!p.employees) {
                        return {
                            id: p.id, workshop_id: p.workshop_id, employee_id: p.employee_id,
                            name: p.name || 'Unknown Participant', email: p.email || 'No email'
                        };
                    }
                    return {
                        id: p.id, workshop_id: p.workshop_id, employee_id: p.employees.id,
                        name: p.employees.name, email: p.employees.email,
                    }
                }),
                sessions: (Array.isArray(ws.sessions) ? ws.sessions : []).map((session: any) => ({
                    ...session,
                    session_participant_records: session.session_participant_records || [],
                })),
            }));
            setWorkshops(enrichedWorkshops as unknown as Workshop[]);
        } else {
            setWorkshops([]);
        }

        setIsLoading(false);
        return { allEmployees };
    }, []);
    
    const setupUserSession = useCallback(async (session: any | null) => {
        if (session?.user) {
            const roleFromMetadata = session.user.user_metadata?.role;
            const userRole = (roleFromMetadata === 'host') ? roleFromMetadata : 'manager';

            const currentUser: SessionUser = {
                id: session.user.id, name: session.user.email?.split('@')[0] || 'User',
                email: session.user.email!, role: userRole,
            };
            setUser(currentUser);
        } else {
            setUser(null);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        setIsLoading(true);
        fetchAllData(); // Fetch all data on initial load. This is crucial for public pages.
        
        supabase.auth.getSession().then(({ data: { session } }) => {
            setupUserSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setupUserSession(session);
        });

        return () => subscription.unsubscribe();
    }, [setupUserSession, fetchAllData]);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        sessionStorage.removeItem('workshop_session_user');
        setUser(null);
    }, []);
    
     const addWorkshop = useCallback(async (workshopData: { title: string; total_sessions: number; weekday: string; time: string }, hosts: Employee[], participants: Employee[]) => {
        if (!user) throw new Error("User must be logged in to create a workshop.");

        const { data: workshop, error: workshopError } = await supabase
            .from('workshops')
            .insert({ title: workshopData.title, manager_id: user.id })
            .select().single();
        if (workshopError || !workshop) throw new Error(workshopError?.message || "Failed to create workshop.");

        const sessionsToCreate: Array<Database['public']['Tables']['sessions']['Insert']> = [];
        let currentDate = new Date();
        const targetWeekday = parseInt(workshopData.weekday, 10);
        while (currentDate.getDay() !== targetWeekday) {
            currentDate.setDate(currentDate.getDate() + 1);
        }
        const [hours, minutes] = workshopData.time.split(':').map(Number);
        for (let i = 1; i <= workshopData.total_sessions; i++) {
            currentDate.setHours(hours, minutes, 0, 0);
            const endTime = `${String(hours + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            sessionsToCreate.push({
                workshop_id: workshop.id, session_number: i, title: `Session ${i}`,
                date: currentDate.toISOString().split('T')[0], start_time: workshopData.time,
                end_time: endTime, status: 'scheduled' as const,
            });
            currentDate.setDate(currentDate.getDate() + 7);
        }
        const { data: sessions, error: sessionsError } = await supabase.from('sessions').insert(sessionsToCreate).select();
        if (sessionsError || !sessions) throw new Error(sessionsError?.message || "Failed to create sessions.");

        const hostsToCreate: Array<Database['public']['Tables']['hosts']['Insert']> = hosts.map(h => ({ workshop_id: workshop.id, employee_id: h.id }));
        const { error: hostsError } = await supabase.from('hosts').insert(hostsToCreate);
        if (hostsError) throw new Error(hostsError.message);

        const participantsToCreate: Array<Database['public']['Tables']['participants']['Insert']> = participants.map(p => ({ workshop_id: workshop.id, employee_id: p.id, name: p.name, email: p.email }));
        const { data: createdParticipants, error: participantsError } = await supabase.from('participants').insert(participantsToCreate).select();
        if (participantsError || !createdParticipants) throw new Error(participantsError?.message || "Failed to create participants.");
        
        const recordsToCreate: Array<Database['public']['Tables']['session_participant_records']['Insert']> = [];
        for (const session of sessions) {
            for (const participant of createdParticipants) {
                recordsToCreate.push({
                    session_id: session.id, participant_id: participant.id, attendance: 'pending' as const
                });
            }
        }
        const { error: recordsError } = await supabase.from('session_participant_records').insert(recordsToCreate);
        if (recordsError) throw new Error(recordsError.message);

        await fetchAllData(); // Refresh all data after successful creation
            
    }, [user, fetchAllData]);
    
    const addEmployees = useCallback(async (newEmployees: { name: string; email: string }[]) => {
        setIsLoading(true);
        try {
            if (newEmployees.length === 0) return { error: null };
            
            const { error: functionError } = await supabase.functions.invoke('import-employees', {
                body: { users: newEmployees },
            });

            if (functionError) throw functionError;

            await fetchAllData();
            return { error: null };
        } catch (err: any) {
            console.error("Error invoking import-employees function:", err);
            let errorMessage = `Import failed: ${err.message || 'An unknown error occurred.'}`;
            return { error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [fetchAllData]);

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
    
    const workshopsForUser = useMemo(() => {
        if (!user) return []; // Should not happen in protected routes, but good practice
        if (user.role === 'manager') return workshops;
        
        // Filter for host
        const hostEmployee = employees.find(emp => emp.email === user.email);
        if (!hostEmployee) return [];

        return workshops.filter(ws => 
            ws.hosts.some(h => h.employee_id === hostEmployee.id)
        );
    }, [user, workshops, employees]);

    const value = useMemo(() => ({
        user,
        workshops: workshopsForUser,
        allWorkshops: workshops, // Provide all workshops for public pages
        employees,
        isLoading,
        logout,
        addWorkshop,
        addEmployees,
        updateSession,
        deleteWorkshop,
        updateSessionInState,
        updateParticipantRecordInState
    }), [user, workshopsForUser, workshops, employees, isLoading, logout, addWorkshop, addEmployees, updateSession, deleteWorkshop, updateSessionInState, updateParticipantRecordInState]);

    return (
        <AppContext.Provider value={value}>
            <HashRouter>
                <AppContent />
            </HashRouter>
        </AppContext.Provider>
    );
};

export default App;