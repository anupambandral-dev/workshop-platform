import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { supabase } from '../services/supabase';
import type { AppContextType, Workshop, ChatMessage, Participant, Feedback, SessionUser, Host, SessionWithRecords, HostReflection } from '../types';
import { UsersIcon, SendIcon, CheckCircleIcon } from '../components/Icons';

// --- Helper Components ---

const ChatPanel: React.FC<{ chat: ChatMessage[], currentUser: SessionUser, onSend: (message: string) => void, isReadOnly?: boolean }> = ({ chat, currentUser, onSend, isReadOnly = false }) => {
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
                    <li key={host.id} className="p-3 flex items-center justify-between">
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

const FeedbackForm: React.FC<{ workshopTitle: string, sessionTitle: string, onSubmit: (feedback: Feedback) => void }> = ({ workshopTitle, sessionTitle, onSubmit }) => {
    const [interactive, setInteractive] = useState(3);
    const [helpful, setHelpful] = useState(3);
    const [overall, setOverall] = useState(3);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ interactive, helpful, overall });
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-xl mt-10">
            <h2 className="text-2xl font-bold text-center">Session Feedback</h2>
            <p className="text-center text-gray-600 mt-1 mb-6">For "{workshopTitle} - {sessionTitle}"</p>
            <form onSubmit={handleSubmit} className="space-y-6">
                {[
                    { label: 'Was the session interactive?', value: interactive, setter: setInteractive },
                    { label: 'Was the session helpful?', value: helpful, setter: setHelpful },
                    { label: 'How would you rate the session overall?', value: overall, setter: setOverall },
                ].map(({ label, value, setter }) => (
                    <div key={label}>
                        <label className="block text-sm font-medium text-gray-700">{label}</label>
                        <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm text-gray-500">1</span>
                            <input type="range" min="1" max="5" value={value} onChange={(e) => setter(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                            <span className="text-sm text-gray-500">5</span>
                            <span className="font-bold text-primary w-4 text-center">{value}</span>
                        </div>
                    </div>
                ))}
                <button type="submit" className="w-full mt-4 flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                    Submit Feedback
                </button>
            </form>
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
    const { workshops, updateSession } = useContext(AppContext) as AppContextType;
    const navigate = useNavigate();

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
    const [pageState, setPageState] = useState<'loading' | 'live' | 'feedback' | 'ended' | 'error'>('loading');

    const { workshop, session } = useMemo(() => {
        if (!sessionId || workshops.length === 0) return { workshop: null, session: null };
        for (const ws of workshops) {
            const s = ws.sessions.find(s => s.id === sessionId);
            if (s) return { workshop: ws, session: s };
        }
        return { workshop: null, session: null };
    }, [sessionId, workshops]);

    useEffect(() => {
        let sessionUser: SessionUser | null = null;
        try {
            const stored = sessionStorage.getItem('workshop_session_user');
            if (stored) sessionUser = JSON.parse(stored);
        } catch(e) { /* ignore */ }
        
        if (!sessionUser || !sessionId) {
            navigate(`/session/${sessionId}/join`);
            return;
        }
        setCurrentUser(sessionUser);

        if (workshops.length > 0 && !session) {
             setPageState('error');
             return;
        }

        if (workshop && session) {
            const hostCheck = workshop.hosts.some(h => h.email === sessionUser!.email) || sessionUser!.role === 'manager';
            setIsHost(hostCheck);

            if (session.status === 'ended') {
                if (!hostCheck) { // I'm a participant
                    const myRecord = session.session_participant_records.find(r => r.participant_id === sessionUser!.id);
                    if (myRecord && !myRecord.feedback) setPageState('feedback');
                    else setPageState('ended');
                } else { // I'm a host/manager
                    setPageState('ended');
                }
            } else if (session.status === 'live' || session.status === 'scheduled') {
                setPageState('live');
            }
        }
    }, [sessionId, workshops, workshop, session, navigate]);
    
    // Realtime chat subscription
    useEffect(() => {
        if (!session) return;
        
        const fetchChat = async () => {
            const { data, error } = await supabase.from('chat_messages').select('*').eq('session_id', session.id).order('created_at');
            if (error) console.error("Error fetching chat:", error);
            else setChatMessages((data as any) || []);
        };
        fetchChat();

        const channel = supabase.channel(`chat_${session.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${session.id}` },
                (payload) => {
                    setChatMessages(currentMessages => [...currentMessages, payload.new as ChatMessage]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session]);

    const handleSendMessage = async (message: string) => {
        if (!currentUser || !session) return;
        const newMessage = {
            session_id: session.id,
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            message: message,
        };
        const { error } = await (supabase.from('chat_messages') as any).insert(newMessage);
        if (error) console.error("Error sending message:", error);
    };

    const handleSubmitFeedback = async (feedback: Feedback) => {
        if (!session || !currentUser) return;
        const myRecord = session.session_participant_records.find(p => p.participant_id === currentUser.id);
        if (myRecord) {
            myRecord.feedback = feedback;
            await updateSession(session);
            setPageState('ended');
        }
    };

    const handleSaveReflection = async (reflection: HostReflection) => {
        if (!session) return;
        await updateSession({
            ...session,
            status: 'ended',
            host_reflection: reflection,
        });
        setIsReflectionModalOpen(false);
        setPageState('ended');
    };

    if (!workshop || !session) {
       return <div className="p-10 text-center">{pageState === 'error' ? 'Error: Session not found' : 'Loading session...'}</div>;
    }

    if (pageState === 'feedback') return <FeedbackForm workshopTitle={workshop.title} sessionTitle={session.title} onSubmit={handleSubmitFeedback} />;

    if (pageState === 'ended') {
        // After session ends, host is taken here. This view is now simpler.
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center my-20">
                    <h1 className="text-3xl font-bold text-gray-900">{workshop.title} - {session.title}</h1>
                    <p className="mt-4 text-lg text-gray-600">This session has ended. Thank you for your participation.</p>
                     {isHost && (
                        <p className="mt-2 text-sm text-gray-500">Your reflection has been saved.</p>
                    )}
                </div>
            </div>
        );
    }

    return ( // Live state
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{workshop.title}</h1>
                    <p className="text-lg text-gray-600">{session.title} - Session is live</p>
                </div>
                {isHost && (
                    <button onClick={() => setIsReflectionModalOpen(true)} className="px-5 py-3 font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        End Session for All
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
                <div className="lg:col-span-2 h-full">
                    {currentUser && <ChatPanel chat={chatMessages} currentUser={currentUser} onSend={handleSendMessage} />}
                </div>
                <div className="h-full">
                    <ParticipantsPanel hosts={workshop.hosts} participants={workshop.participants} session={session} />
                </div>
            </div>

            {isReflectionModalOpen && (
                <HostReflectionModal
                    participants={workshop.participants}
                    onClose={() => setIsReflectionModalOpen(false)}
                    onSubmit={handleSaveReflection}
                />
            )}
        </div>
    );
};

export default LiveSessionPage;
