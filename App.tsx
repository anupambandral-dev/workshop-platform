import React, { useState, useMemo, useCallback, useEffect, createContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import type { AppContextType, Workshop, SessionUser, Host, Participant, Database } from './types';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import JoinSessionPage from './pages/JoinSessionPage';
import LiveSessionPage from './pages/LiveSessionPage';
import { LogoIcon } from './components/Icons';

export const AppContext = createContext<AppContextType | null>(null);

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<SessionUser | null>(null);
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session) {
                setUser({
                    id: session.user.id,
                    email: session.user.email!,
                    name: session.user.user_metadata.full_name || 'Manager',
                    role: 'manager'
                });
            }
            setIsLoading(false);
        };
        fetchSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                 setUser({
                    id: session.user.id,
                    email: session.user.email!,
                    name: session.user.user_metadata.full_name || 'Manager',
                    role: 'manager'
                });
            } else {
                setUser(null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const fetchWorkshops = useCallback(async () => {
        if (!session) return;
        const { data, error } = await supabase
            .from('workshops')
            .select('*, hosts(*), participants(*)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching workshops:', error);
        } else {
            setWorkshops(data || []);
        }
    }, [session]);


    useEffect(() => {
        fetchWorkshops();
    }, [fetchWorkshops]);

    const addWorkshop = useCallback(async (
        workshopData: Omit<Database['public']['Tables']['workshops']['Insert'], 'id' | 'created_at' | 'manager_id' | 'status'>,
        hosts: Omit<Database['public']['Tables']['hosts']['Insert'], 'id' | 'workshop_id'>[],
        participants: Omit<Database['public']['Tables']['participants']['Insert'], 'id' | 'workshop_id' | 'attendance' | 'feedback' | 'evaluation'>[]
    ) => {
        if (!user) throw new Error("User not authenticated");
        
        // 1. Insert workshop
        const { data: newWorkshop, error: workshopError } = await supabase
            .from('workshops')
            .insert({ ...workshopData, manager_id: user.id })
            .select()
            .single();

        if (workshopError || !newWorkshop) {
            console.error("Error creating workshop:", workshopError);
            return;
        }

        // 2. Insert hosts and participants
        const hostsToInsert = hosts.map(h => ({ ...h, workshop_id: newWorkshop.id }));
        const participantsToInsert = participants.map(p => ({ ...p, workshop_id: newWorkshop.id }));

        const [{ error: hostsError }, { error: participantsError }] = await Promise.all([
             supabase.from('hosts').insert(hostsToInsert),
             supabase.from('participants').insert(participantsToInsert)
        ]);

        if (hostsError) console.error("Error creating hosts:", hostsError);
        if (participantsError) console.error("Error creating participants:", participantsError);
        
        await fetchWorkshops(); // Refresh data
    }, [user, fetchWorkshops]);

    const updateWorkshop = useCallback(async (updatedWorkshop: Workshop) => {
        const { id, hosts, participants, ...workshopDetails } = updatedWorkshop;
        const { error } = await supabase.from('workshops').update(workshopDetails).eq('id', id);
        if (error) console.error("Error updating workshop:", error);
        // Participants/hosts are updated separately
        await fetchWorkshops();
    }, [fetchWorkshops]);
    
    const updateParticipant = useCallback(async (updatedParticipant: Participant) => {
        const { id, ...updateData } = updatedParticipant;
        const { error } = await supabase.from('participants').update(updateData).eq('id', id);
        if (error) console.error("Error updating participant:", error);
        await fetchWorkshops();
    }, [fetchWorkshops]);


    const appContextValue = useMemo(() => ({
        session,
        user,
        workshops,
        isLoading,
        addWorkshop,
        updateWorkshop,
        updateParticipant,
    }), [session, user, workshops, isLoading, addWorkshop, updateWorkshop, updateParticipant]);

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
                                        onClick={() => supabase.auth.signOut()}
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
                            <Route path="/session/:workshopId/join" element={<JoinSessionPage />} />
                            <Route path="/session/:workshopId/live" element={<LiveSessionPage />} />
                        </Routes>
                    </main>
                </div>
            </HashRouter>
        </AppContext.Provider>
    );
};

export default App;
