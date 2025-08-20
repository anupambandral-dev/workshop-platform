import React, { useState, useContext, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { supabase } from '../services/supabase';
import type { AppContextType, Workshop, ChatMessage, Participant, Feedback, SessionUser, Evaluation, Host } from '../types';
import { UsersIcon, SendIcon, CheckCircleIcon } from '../components/Icons';

// --- Helper Components ---

const ChatPanel: React.FC<{ workshopId: string, chat: ChatMessage[], currentUser: SessionUser, isReadOnly?: boolean }> = ({ workshopId, chat, currentUser, isReadOnly = false }) => {
    const [message, setMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            await supabase.from('chat_messages').insert([{
                workshop_id: workshopId,
                sender_id: currentUser.id,
                sender_name: currentUser.name,
                message: message.trim(),
            }]);
            setMessage('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-bold p-4 border-b">{isReadOnly ? 'Chat History' : 'Live Chat'}</h3>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chat.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((msg) => (
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

const ParticipantsPanel: React.FC<{ hosts: Host[], participants: Participant[] }> = ({ hosts, participants }) => (
    <div className="bg-white rounded-lg shadow-md">
        <h3 className="text-lg font-bold p-4 border-b flex items-center">
            <UsersIcon className="h-6 w-6 mr-2" /> Participants ({participants.filter(p => p.attendance === 'present').length}/{participants.length})
        </h3>
        <ul className="divide-y max-h-96 overflow-y-auto">
            {hosts.map(host => (
                <li key={host.id} className="p-3 flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{host.name}</span>
                    <span className="px-2 py-0.5 text-xs font-medium text-primary-800 bg-primary-100 rounded-full">Host</span>
                </li>
            ))}
            {participants.map(p => (
                <li key={p.id} className="p-3 flex items-center justify-between">
                    <span className="text-gray-700">{p.name}</span>
                    {p.attendance === 'present' ? (
                        <span className="px-2 py-0.5 text-xs font-medium text-green-800 bg-green-100 rounded-full">Present</span>
                    ) : (
                        <span className="px-2 py-0.5 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">Pending</span>
                    )}
                </li>
            ))}
        </ul>
    </div>
);

const FeedbackForm: React.FC<{ workshopTitle: string, onSubmit: (feedback: Feedback) => void }> = ({ workshopTitle, onSubmit }) => {
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
            <p className="text-center text-gray-600 mt-1 mb-6">For "{workshopTitle}"</p>
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
const EvaluationModal: React.FC<{ 
    participant: Participant, 
    onClose: () => void, 
    onSubmit: (participantId: string, evaluation: Evaluation) => void 
}> = ({ participant, onClose, onSubmit }) => {
    const initialEval = (participant.evaluation as Evaluation | null);
    const [active, setActive] = useState(initialEval?.active || 3);
    const [valueAdded, setValueAdded] = useState(initialEval?.valueAdded || 3);
    const [overall, setOverall] = useState(initialEval?.overall || 3);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(participant.id, { active, valueAdded, overall });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900">Evaluate: {participant.name}</h3>
                        <p className="mt-1 text-sm text-gray-600">{participant.email}</p>
                    </div>
                    <div className="px-6 py-4 space-y-6 border-t border-b">
                        {[
                            { label: 'Was the participant active?', value: active, setter: setActive },
                            { label: 'Did they add value to the workshop?', value: valueAdded, setter: setValueAdded },
                            { label: 'Overall rating?', value: overall, setter: setOverall },
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
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-700">Save Evaluation</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EvaluationPanel: React.FC<{ participants: Participant[], onSaveEvaluation: (participantId: string, evaluation: Evaluation) => void }> = ({ participants, onSaveEvaluation }) => {
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

    const handleSave = (participantId: string, evaluation: Evaluation) => {
        onSaveEvaluation(participantId, evaluation);
        setSelectedParticipant(null);
    };
    
    return (
        <div className="w-full max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-xl mt-10">
            <h2 className="text-2xl font-bold">Participant Evaluation</h2>
            <p className="mt-1 text-gray-600">Click on a participant to submit their evaluation. Evaluated participants will have a green checkmark.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                {participants.map(p => (
                    <button key={p.id} onClick={() => setSelectedParticipant(p)} className={`p-4 text-left border rounded-lg flex items-center justify-between transition-all ${p.evaluation ? 'border-green-300 bg-green-50 hover:bg-green-100' : 'border-gray-300 bg-white hover:bg-gray-50'}`} aria-label={`Evaluate ${p.name}`}>
                        <div>
                            <p className="font-semibold text-gray-800">{p.name}</p>
                            <p className="text-sm text-gray-500">{p.email}</p>
                        </div>
                        {p.evaluation && <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" aria-hidden="true" />}
                    </button>
                ))}
            </div>
            {selectedParticipant && <EvaluationModal participant={selectedParticipant} onClose={() => setSelectedParticipant(null)} onSubmit={handleSave} />}
        </div>
    );
}

// --- Main Component ---

const LiveSessionPage: React.FC = () => {
    const { workshopId } = useParams<{ workshopId: string }>();
    const { user: managerUser } = useContext(AppContext) as AppContextType;
    const navigate = useNavigate();

    const [workshop, setWorkshop] = useState<Workshop | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [hosts, setHosts] = useState<Host[]>([]);
    const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [pageState, setPageState] = useState<'loading' | 'live' | 'feedback' | 'ended' | 'error'>('loading');

    useEffect(() => {
        let sessionUser: SessionUser | null = null;
        try {
            const stored = sessionStorage.getItem('workshop_session_user');
            if (stored) sessionUser = JSON.parse(stored);
            else if (managerUser) sessionUser = managerUser;
        } catch(e) { /* ignore */ }
        
        if (!sessionUser || !workshopId) {
            navigate(`/session/${workshopId}/join`);
            return;
        }
        setCurrentUser(sessionUser);

        const fetchWorkshop = async () => {
            const { data, error } = await supabase.from('workshops').select('*, participants(*), hosts(*)').eq('id', workshopId).single();
            if (error || !data) { setPageState('error'); return; }

            const ws = data as Workshop;
            setWorkshop(ws);
            setParticipants(ws.participants);
            setHosts(ws.hosts);

            const hostCheck = ws.hosts.some(h => h.email === sessionUser!.email) || sessionUser!.role === 'manager';
            setIsHost(hostCheck);

            if (ws.status === 'ended') {
                if (!hostCheck) {
                    const p = ws.participants.find(p => p.id === sessionUser!.id);
                    if (p && !p.feedback) setPageState('feedback');
                    else setPageState('ended');
                } else {
                    setPageState('ended');
                }
            } else {
                setPageState('live');
            }
        };

        const fetchChat = async () => {
            const { data, error } = await supabase.from('chat_messages').select('*').eq('workshop_id', workshopId);
            if (!error) setChatMessages((data as ChatMessage[]) || []);
        };

        fetchWorkshop();
        fetchChat();

        const chatSub = supabase.channel(`chat-${workshopId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `workshop_id=eq.${workshopId}` }, payload => {
                setChatMessages(current => [...current, payload.new as ChatMessage]);
            }).subscribe();
        
        const participantSub = supabase.channel(`participants-${workshopId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'participants', filter: `workshop_id=eq.${workshopId}` }, payload => {
                setParticipants(current => current.map(p => p.id === payload.new.id ? payload.new as Participant : p));
            }).subscribe();
        
        const workshopSub = supabase.channel(`workshops-${workshopId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workshops', filter: `id=eq.${workshopId}` }, payload => {
                setWorkshop(current => ({ ...current!, ...(payload.new as Workshop) }));
                if(payload.new.status === 'ended') {
                   if (!isHost) setPageState('feedback'); else setPageState('ended');
                }
            }).subscribe();


        return () => {
            supabase.removeChannel(chatSub);
            supabase.removeChannel(participantSub);
            supabase.removeChannel(workshopSub);
        };

    }, [workshopId, managerUser, navigate, isHost]);

    const handleEndSession = async () => {
        if (!workshop) return;
        await supabase.from('workshops').update({ status: 'ended' } as any).eq('id', workshop.id);
    };

    const handleSubmitFeedback = async (feedback: Feedback) => {
        if (!workshop || !currentUser) return;
        await supabase.from('participants').update({ feedback: feedback as any } as any).eq('id', currentUser.id);
        setPageState('ended');
    };

    const handleSaveEvaluation = async (participantId: string, evaluation: Evaluation) => {
        await supabase.from('participants').update({ evaluation: evaluation as any } as any).eq('id', participantId);
    };

    if (pageState === 'loading') return <div className="p-10 text-center">Loading session...</div>;
    if (pageState === 'error' || !workshop) return <div className="p-10 text-center text-red-600">Error: Workshop not found.</div>;

    if (pageState === 'feedback') return <FeedbackForm workshopTitle={workshop.title} onSubmit={handleSubmitFeedback} />;

    if (pageState === 'ended' || workshop.status === 'ended') {
        if (isHost) {
            return (
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Workshop Ended: {workshop.title}</h1>
                        <p className="text-lg text-gray-600">Review evaluations and chat history.</p>
                    </div>
                    <EvaluationPanel participants={participants} onSaveEvaluation={handleSaveEvaluation} />
                    <div className="max-w-4xl mx-auto mt-12 h-[70vh]">
                        {currentUser && <ChatPanel workshopId={workshop.id} chat={chatMessages} currentUser={currentUser} isReadOnly={true} />}
                    </div>
                </div>
            );
        }
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center my-20">
                    <h1 className="text-3xl font-bold text-gray-900">Workshop Ended: {workshop.title}</h1>
                    <p className="mt-4 text-lg text-gray-600">Thank you for your participation.</p>
                </div>
            </div>
        );
    }

    return ( // Live state
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{workshop.title}</h1>
                    <p className="text-lg text-gray-600">Session is live</p>
                </div>
                {isHost && (
                    <button onClick={handleEndSession} className="px-5 py-3 font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        End Session for All
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
                <div className="lg:col-span-2 h-full">
                    {currentUser && <ChatPanel workshopId={workshop.id} chat={chatMessages} currentUser={currentUser} />}
                </div>
                <div className="h-full">
                    <ParticipantsPanel hosts={hosts} participants={participants} />
                </div>
            </div>
        </div>
    );
};

export default LiveSessionPage;