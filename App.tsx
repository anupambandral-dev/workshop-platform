import React, { useState, useMemo, useCallback, useEffect, createContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { mockApi } from './services/mockApi';
import type { AppContextType, Workshop, SessionUser, Session } from './types';
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
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            setIsLoading(true);
            try {
                const storedUser = sessionStorage.getItem('workshop_session_user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                console.error("Failed to parse session user", e);
                sessionStorage.removeItem('workshop_session_user');
            }
            setIsLoading(false);
        };
        checkSession();
    }, []);

    const fetchWorkshops = useCallback(async () => {
        setIsLoading(true);
        const data = await mockApi.getWorkshops();
        setWorkshops(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (user) {
            fetchWorkshops();
        }
    }, [user, fetchWorkshops]);
    
    const login = useCallback(async (email: string, pass: string) => {
        const loggedInUser = await mockApi.login(email, pass);
        setUser(loggedInUser);
    }, []);

    const logout = useCallback(() => {
        mockApi.logout();
        setUser(null);
        setWorkshops([]);
    }, []);

    const addWorkshop: AppContextType['addWorkshop'] = useCallback(async (workshopData, hosts, participants) => {
        await mockApi.addWorkshop(workshopData, hosts, participants);
        await fetchWorkshops();
    }, [fetchWorkshops]);
    
    const updateWorkshop = useCallback(async (updatedWorkshop: Workshop) => {
        await mockApi.updateWorkshop(updatedWorkshop);
        // Optimistically update local state for faster UI response
        setWorkshops(prev => prev.map(ws => ws.id === updatedWorkshop.id ? updatedWorkshop : ws));
    }, []);
    
    const updateSession = useCallback(async (updatedSession: Session) => {
        await mockApi.updateSession(updatedSession);
        await fetchWorkshops(); // Fetch all workshops to ensure consistency
    }, [fetchWorkshops]);

    const appContextValue = useMemo(() => ({
        user,
        workshops,
        isLoading,
        login,
        logout,
        addWorkshop,
        updateWorkshop,
        updateSession,
    }), [user, workshops, isLoading, login, logout, addWorkshop, updateWorkshop, updateSession]);

    return (
        <AppContext.Provider value={appContextValue}>
            <HashRouter>
                <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
                    <header className="bg-white shadow-sm">
                        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center py-4">
                                <Link to="/dashboard" className="flex items-center space-x-2 cursor-pointer" aria-label="Go to dashboard">
                                    <LogoIcon className="h-8 w-8 text-primary" />
                                    <span className="text-2xl font-bold text-gray-800">Workshop<span className="text-primary">Platform</span></span>
                                </Link>
                                {user && (
                                    <button
                                        onClick={logout}
                                        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                                    >
                                        Logout
                                    </button>
                                )}
                            </div>
                        </nav>
                    </header>
                    <main>
                        <Routes>
                            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
                            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
                            <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
                            <Route path="/workshop/:workshopId" element={user ? <WorkshopDetailPage /> : <Navigate to="/login" />} />
                            <Route path="/workshop/:workshopId/session/:sessionId" element={user ? <SessionDetailPage /> : <Navigate to="/login" />} />
                            <Route path="/session/:sessionId/join" element={<JoinSessionPage />} />
                            <Route path="/session/:sessionId/live" element={<LiveSessionPage />} />
                        </Routes>
                    </main>
                </div>
            </HashRouter>
        </AppContext.Provider>
    );
};

export default App;