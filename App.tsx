import React, { useState, useMemo, useCallback, useEffect, createContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './services/supabase';
import type { AppContextType, Workshop, SessionUser, SessionWithRecords, Employee, SessionParticipantRecord, Session } from './types';
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

    const fetchData = useCallback(async (currentUserId: string, currentUserRole: string) => {
        setIsLoading(true);

        const { data: employeesData, error: employeesError } = await supabase
            .from('employees')
            .select('*')
            .order('name');
        if (employeesError) console.error('Error fetching employees:', employeesError);
        const allEmployees = (employeesData as Employee[]) || [];
        setEmployees(allEmployees);

        let workshopQuery = supabase.from('workshops').select(`
            *,
            hosts ( user_id ),
            participants ( id, employee_id ),
            sessions ( *, session_participant_records ( * ) )
        `);

        if (currentUserRole === 'manager') {
            workshopQuery = workshopQuery.eq('manager_id', currentUserId);
        } else if (currentUserRole === 'host') {
            workshopQuery = workshopQuery.filter('hosts.user_id', 'cs', `{${currentUserId}}`);
        } else if (currentUserRole === 'participant') {
             workshopQuery = workshopQuery.filter('participants.employee_id', 'eq', currentUserId);
        }
        
        const { data, error } = await workshopQuery.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching workshops:', error);
            setWorkshops([]);
        } else {
             const enrichedWorkshops = data.map((ws: any) => ({
                ...ws,
                hosts: ws.hosts.map((h: { user_id: string }) => {
                    const employee = allEmployees.find(e => e.id === h.user_id);
                    return { user_id: h.user_id, name: employee?.name, email: employee?.email };
                }),
                participants: ws.participants.map((p: { id: string; employee_id: string; }) => {
                    const employee = allEmployees.find(e => e.id === p.employee_id);
                    return { ...p, name: employee?.name, email: employee?.email };
                }),
                sessions: ws.sessions.sort((a: Session, b: Session) => a.session_number - b.session_number),
            }));
            setWorkshops(enrichedWorkshops);
        }

        setIsLoading(false);
    }, []);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setIsLoading(true);
            if (session) {
                const { data: { user: currentUser } } = await supabase.auth.getUser();

                if (currentUser) {
                    const { data: employee, error } = await supabase
                        .from('employees')
                        .select('name')
                        .eq('id', currentUser.id)
                        .single();
                    
                    if (error) console.error("Error fetching user's name:", error);

                    const role = currentUser.app_metadata?.role || 'participant';
                    const sessionUser: SessionUser = {
                        id: currentUser.id,
                        email: currentUser.email!,
                        name: employee?.name || currentUser.email!,
                        role: role as 'manager' | 'host' | 'participant',
                    };
                    setUser(sessionUser);
                    await fetchData(currentUser.id, role);
                } else {
                    setUser(null);
                    setWorkshops([]);
                }
            } else {
                setUser(null);
                setWorkshops([]);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [fetchData]);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setWorkshops([]);
    }, []);

    const addWorkshop = useCallback(async (
        workshopData: { title: string; total_sessions: number; weekday: string; time: string },
        hosts: Employee[],
        participants: Employee[]
    ) => {
        if (!user) throw new Error("User must be logged in to create a workshop.");

        const payload = {
            ...workshopData,
            hosts: hosts.map(h => h.id),
            participants: participants.map(p => p.id),
        };

        const { error } = await supabase.functions.invoke('create-workshop', {
            body: payload,
        });

        if (error) {
            console.error('Error invoking create-workshop function:', error);
            throw new Error(`Failed to create workshop. ${error.message || 'Please check the function logs.'}`);
        }

        await fetchData(user.id, user.role);
    }, [user, fetchData]);

    const addEmployees = useCallback(async (newEmployees: { name: string; email: string }[]) => {
        const { error } = await supabase.functions.invoke('import-employees', {
            body: { users: newEmployees },
        });

        if (error) {
            console.error('Error invoking import-employees function:', error);
            return { error: error.message || 'An unknown error occurred during import.' };
        }

        const { data: employeesData, error: employeesError } = await supabase.from('employees').select('*').order('name');
        if (employeesError) console.error("Failed to refetch employees", employeesError);
        else setEmployees((employeesData as Employee[]) || []);

        return { error: null };
    }, []);

    const deleteWorkshop = useCallback(async (workshopId: string) => {
        const { error } = await supabase.from('workshops').delete().eq('id', workshopId);
        if (error) throw error;
        setWorkshops(prev => prev.filter(ws => ws.id !== workshopId));
    }, []);

    const updateSession = useCallback(async (session: SessionWithRecords) => {
        const { id, host_reflection, status, title, date, start_time, end_time, session_participant_records } = session;
        
        const { error } = await supabase.from('sessions').update({ host_reflection, status, title, date, start_time, end_time }).eq('id', id);
        if (error) throw error;
        
        if (session_participant_records) {
            for (const record of session_participant_records) {
                const { error: recordError } = await supabase
                    .from('session_participant_records')
                    .update({ attendance: record.attendance })
                    .eq('id', record.id);
                if (recordError) console.error("Failed to update record:", recordError);
            }
        }
        
        setWorkshops(prevWorkshops => prevWorkshops.map(ws => ({
            ...ws,
            sessions: ws.sessions.map(s => s.id === id ? session : s)
        })));
    }, []);

    const updateSessionInState = useCallback((updatedSession: SessionWithRecords) => {
        setWorkshops(prevWorkshops => prevWorkshops.map(ws => {
            if (ws.id !== updatedSession.workshop_id) return ws;
            return {
                ...ws,
                sessions: ws.sessions.map(s => s.id === updatedSession.id ? updatedSession : s),
            };
        }));
    }, []);

    const updateParticipantRecordInState = useCallback((updatedRecord: SessionParticipantRecord) => {
        setWorkshops(prevWorkshops => prevWorkshops.map(ws => ({
            ...ws,
            sessions: ws.sessions.map(s => {
                if (s.id !== updatedRecord.session_id) return s;
                return {
                    ...s,
                    session_participant_records: s.session_participant_records.map(r => r.id === updatedRecord.id ? updatedRecord : r)
                };
            })
        })));
    }, []);

    const appContextValue = useMemo(() => ({
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
        updateParticipantRecordInState,
    }), [user, workshops, employees, isLoading, logout, addWorkshop, addEmployees, updateSession, deleteWorkshop, updateSessionInState, updateParticipantRecordInState]);

    return (
        <AppContext.Provider value={appContextValue}>
            <HashRouter>
                <AppContent />
            </HashRouter>
        </AppContext.Provider>
    );
};

export default App;
