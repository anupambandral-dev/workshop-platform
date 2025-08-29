import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { supabase } from '../services/supabase';
import type { AppContextType, Workshop, ChatMessage, Participant, CurrentUser, Host, Session, SessionWithRecords, HostReflection, SessionParticipantRecord } from '../types';
import { UsersIcon, SendIcon, CheckCircleIcon } from '../components/Icons';

// --- Helper Components ---

const ChatPanel: React.FC<{ chat: ChatMessage[], currentUser: CurrentUser, onSend: (message: string) => void, isReadOnly?: boolean }> = ({ chat, currentUser, onSend, isReadOnly = false }) => {
    const [message, setMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            onSend(message.trim());
            setMessage('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-bold p-4 border-b">{isReadOnly ? 'Chat History' : 'Live Chat'}</h3>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chat.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg max-w-xs lg:max-w-md ${msg.sender_id === currentUser.id ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'}`}>
                            <p className="font-bold text-sm">{msg.sender_name}</p>
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            {!isReadOnly && (
                <form onSubmit={handleSend} className="p-4 border-t flex items-center space-x-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        aria-label="Chat message input"
                    />
                    <button type="submit" className="p-2 text-white bg-primary rounded-full hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" aria-label="Send message">
                        <SendIcon className="h-5 w-5" />
                    </button>
                </form>
            )}
        </div>
    );
};

const ParticipantsPanel: React.FC<{ hosts: Host[], participants: Participant[], session: SessionWithRecords }> = ({ hosts, participants, session }) => {
    const presentCount = session.session_participant_records.filter(r => r.attendance === 'present').length;
    
    return (
        <div className="bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-bold p-4 border-b flex items-center">
                <UsersIcon className="h-6 w-6 mr-2" /> Participants ({presentCount}/{participants.length})
            </h3>
            <ul className="divide-y max-h-96 overflow-y-auto">
                {hosts.map(host => (
                    <li key={host.employee_id} className="p-3 flex items-center justify-between">
                        <span className="font-semibold text-gray-800">{host.name}</span>
                        <span className="px-2 py-0.5 text-xs font-medium text-primary-800 bg-primary-100 rounded-full">Host</span>
                    </li>
                ))}
                {participants.map(p => {
                    const record = session.session_participant_records.find(r => r.participant_id === p.id);
                    const isPresent = record?.attendance === 'present';
                    return (
                        <li key={p.id} className="p-3 flex items-center justify-between">
                            <span className="text-gray-700">{p.name}</span>
                            {isPresent ? (
                                <span className="px-2 py-0.5 text-xs font-medium text-green-800 bg-green-100 rounded-full">Present</span>
                            ) : (
                                <span className="px-2 py-0.5 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">Pending</span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

const HostReflectionModal: React.FC<{
    participants: Participant[];
    onClose: () => void;
    onSubmit: (reflection: HostReflection) => void;
}> = ({ participants, onClose, onSubmit }) => {
    const [proactiveParticipantId, setProactiveParticipantId] = useState(participants[0]?.id || '');
    const [lessEngagedParticipantId, setLessEngagedParticipantId] = useState(participants[0]?.id || '');
    const [ahaMoment, setAhaMoment] = useState('');
    const [biggestChallenge, setBiggestChallenge] = useState('');
    const [overallSuccess, setOverallSuccess] = useState(3);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const proactiveParticipant = participants.find(p => p.id === proactiveParticipantId);
        const lessEngagedParticipant = participants.find(p => p.id === lessEngagedParticipantId);

        if (!proactiveParticipant || !lessEngagedParticipant) {
            alert("Please select participants.");
            return;
        }

        onSubmit({
            proactiveParticipantId,
            proactiveParticipantName: proactiveParticipant.name,
            lessEngagedParticipantId,
            lessEngagedParticipantName: lessEngagedParticipant.name,
            ahaMoment,
            biggestChallenge,
            overallSuccess,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900">Host's Reflection</h3>
                        <p className="mt-1 text-sm text-gray-600">Please provide your insights from the session.</p>
                    </div>
                    <div className="px-6 py-4 space-y-6 border-t border-b">
                        <div>
                            <label htmlFor="proactive" className="block text-sm font-medium text-gray-700">Who was the most proactive participant?</label>
                            <select id="proactive" value={proactiveParticipantId} onChange={e => setProactiveParticipantId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                                {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="lessEngaged" className="block text-sm font-medium text-gray-700">Who seemed the least engaged?</label>
                            <select id="lessEngaged" value={lessEngagedParticipantId} onChange={e => setLessEngagedParticipantId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                                {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="ahaMoment" className="block text-sm font-medium text-gray-700">What was the most significant "aha moment"?</label>
                            <textarea id="ahaMoment" value={ahaMoment} onChange={e => setAhaMoment(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" required />
                        </div>
                        <div>
                            <label htmlFor="challenge" className="block text-sm font-medium text-gray-700">What was the biggest challenge you faced?</label>
                            <textarea id="challenge" value={biggestChallenge} onChange={e => setBiggestChallenge(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" required />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">How would you rate the overall success of the session?</label>
                            <div className="flex items-center space-x-4 mt-2">
                                <span className="text-sm text-gray-500">1</span>
                                <input type="range" min="1" max="5" value={overallSuccess} onChange={(e) => setOverallSuccess(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                                <span className="text-sm text-gray-500">5</span>
                                <span className="font-bold text-primary w-4 text-center">{overallSuccess}</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-700">Save & End Session</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Main Component ---

const LiveSessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const { allWorkshops, updateSession, updateSessionInState, updateParticipantRecordInState } = useContext(AppContext) as AppContextType;
    const navigate = useNavigate();

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
    const [pageState, setPageState] = useState<'loading' | 'live' | 'ended' | 'error'>('loading');

    const { workshop, session } = useMemo(() => {
        if (!sessionId || allWorkshops.length === 0) return { workshop: null, session: null };
        for (const ws of allWorkshops) {
            const s = ws.sessions.find(s => s.id === sessionId);
            if (s) return { workshop: ws, session: s };
        }
        return { workshop: null, session: null };
    }, [sessionId, allWorkshops]);

    useEffect(() => {
        let sessionUser: CurrentUser | null = null;
        try {
            const stored = sessionStorage.getItem('workshop_session_user');
            if (stored) sessionUser = JSON.parse(stored);
        } catch(e) { /* ignore */ }
        
        if (!sessionUser || !sessionId) {
            navigate(`/session/${sessionId}/join`);
            return;
        }
        setCurrentUser(sessionUser);

        if (allWorkshops.length > 0 && !session) {
             setPageState('error');
             return;
        }

        if (workshop && session) {
            const hostCheck = workshop.hosts.some(h => h.email === sessionUser!.email) || sessionUser!.role === 'manager';
            setIsHost(hostCheck);

            if (session.status === 'ended') {
                setPageState('ended');
            } else if (session.status === 'live' || session.status === 'scheduled') {
                setPageState('live');
            }
        }
    }, [sessionId, allWorkshops, workshop, session, navigate]);
    
    // This effect runs once for participants to mark their attendance upon joining.
    useEffect(() => {
        // Only run for participants who have been identified
        if (!session || !currentUser || currentUser.role !== 'participant') {
            return;
        }

        const participantRecord = session.session_participant_records.find(
            record => record.participant_id === currentUser.id
        );

        // If the record exists and attendance is still pending, mark as present.
        if (participantRecord && participantRecord.attendance === 'pending') {
            const markAsPresent = async () => {
                try {
                    const { error } = await supabase.functions.invoke('mark-attendance', {
                        body: { sessionId: session.id, email: currentUser.email },
                    });

                    if (error) {
                        console.error('Failed to mark attendance automatically:', error);
                    }
                    // The real-time subscription will handle updating the UI state.
                } catch (err) {
                    console.error('Error invoking mark-attendance function:', err);
                }
            };
            markAsPresent();
        }
    }, [session, currentUser]);
    
    // Real-time subscriptions
    useEffect(() => {
        if (!session || !currentUser) return;
        
        // --- 1. Fetch initial chat messages ---
        const fetchChat = async () => {
            const { data, error } = await supabase.from('chat_messages').select('*').eq('session_id', session.id).order('created_at');
            if (error) console.error("Error fetching chat:", error);
            else setChatMessages((data as any) || []);
        };
        fetchChat();

        // --- 2. Subscribe to new chat messages ---
        const chatChannel = supabase.channel(`chat_${session.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${session.id}` },
                (payload) => {
                    setChatMessages(currentMessages => [...currentMessages, payload.new as ChatMessage]);
                }
            )
            .subscribe();

        // --- 3. Subscribe to session status changes (for participants) ---
        const sessionChannel = supabase.channel(`session_${session.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
                (payload) => {
                    const updatedSession = payload.new as Session;
                    // Update global state without full refetch
                    updateSessionInState({ ...session, ...updatedSession }); 
                    if (updatedSession.status === 'ended') {
                       setPageState('ended'); // Automatically move participant to ended view
                    }
                }
            )
            .subscribe();
        
        // --- 4. Subscribe to attendance changes ---
        const attendanceChannel = supabase.channel(`attendance_${session.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'session_participant_records', filter: `session_id=eq.${session.id}` },
                (payload) => {
                    // Update global state instantly
                    updateParticipantRecordInState(payload.new as SessionParticipantRecord);
                }
            )
            .subscribe();


        return () => {
            supabase.removeChannel(chatChannel);
            supabase.removeChannel(sessionChannel);
            supabase.removeChannel(attendanceChannel);
        };
    }, [session, currentUser, isHost, updateSessionInState, updateParticipantRecordInState]);

    const handleSendMessage = async (message: string) => {
        if (!currentUser || !session) return;
        const newMessage = {
            session_id: session.id,
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            message: message,
        };
        const { error } = await supabase.from('chat_messages').insert(newMessage);
        if (error) console.error("Error sending message:", error);
    };

    const handleSaveReflection = async (reflection: HostReflection) => {
        if (!session) return;
        try {
            await updateSession({
                ...session,
                status: 'ended',
                host_reflection: reflection,
            });
            setIsReflectionModalOpen(false);
            setPageState('ended');
        } catch (error: any) {
            console.error("Failed to save reflection and end session:", error);
            alert(`Error: Could not end session. Please try again. Details: ${error.message}`);
        }
    };

    if (!workshop || !session) {
       return <div className="p-10 text-center">{pageState === 'error' ? 'Error: Session not found' : 'Loading session...'}</div>;
    }

    if (pageState === 'ended') {
        if (isHost) {
            return (
                 <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                     <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{workshop.title} - {session.title}</h1>
                            <p className="mt-2 text-lg text-gray-600">This session has ended.</p>
                        </div>
                        <button
                            onClick={() => navigate(`/host/workshop/${workshop.id}/dashboard`)}
                            className="px-5 py-3 font-medium text-white bg-primary rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            Back to Host Dashboard
                        </button>
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
                        <div className="lg:col-span-2">
                             <ChatPanel chat={chatMessages} currentUser={currentUser!} onSend={handleSendMessage} isReadOnly={true} />
                        </div>
                        <div>
                            <ParticipantsPanel hosts={workshop.hosts} participants={workshop.participants} session={session} />
                        </div>
                     </div>
                 </div>
            );
        }
        // Participant's ended view
        return (
             <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                 <div className="bg-white p-12 rounded-lg shadow-xl border">
                    <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
                    <h2 className="mt-6 text-3xl font-extrapold text-gray-900">Session Ended</h2>
                    <p className="mt-2 text-lg text-gray-600">Thank you for your participation!</p>
                     <p className="mt-1 text-gray-500">{workshop.title} - {session.title}</p>
                     <div className="mt-8">
                         <a 
                             href="https://echogb.typeform.com/to/cY2oFNyx" 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="px-6 py-3 text-base font-medium text-white bg-primary rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                         >
                             Provide Feedback
                         </a>
                     </div>
                 </div>
             </div>
        );
    }

    // Live view for both host and participant
    return (
         <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
             {isReflectionModalOpen && isHost && (
                <HostReflectionModal 
                    participants={workshop.participants}
                    onClose={() => setIsReflectionModalOpen(false)}
                    onSubmit={handleSaveReflection}
                />
             )}
             <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{workshop.title} - {session.title}</h1>
                    <p className="mt-2 text-lg text-gray-600 flex items-center">
                        <span className="relative flex h-3 w-3 mr-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        Session is Live
                    </p>
                </div>
                {isHost && (
                    <button
                        onClick={() => setIsReflectionModalOpen(true)}
                        className="px-5 py-3 font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        End Session
                    </button>
                )}
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
                <div className="lg:col-span-2">
                     <ChatPanel chat={chatMessages} currentUser={currentUser!} onSend={handleSendMessage} />
                </div>
                <div>
                    <ParticipantsPanel hosts={workshop.hosts} participants={workshop.participants} session={session} />
                </div>
             </div>
         </div>
    );
};

export default LiveSessionPage;
