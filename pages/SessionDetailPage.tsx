import React, { useState, useContext, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { AppContextType, CurrentUser, Session, ChatMessage, HostReflection, Participant, SessionWithRecords } from '../types';
import { CalendarIcon, ClockIcon, ClipboardIcon } from '../components/Icons';
import { supabase } from '../services/supabase';
import ChatPanel from '../components/ChatPanel';

type Tab = 'details' | 'go-live' | 'attendance' | 'reflection' | 'chat';

const HostReflectionForm: React.FC<{
    participants: Participant[];
    onSubmit: (reflection: HostReflection) => Promise<void>;
}> = ({ participants, onSubmit }) => {
    const [proactiveParticipantId, setProactiveParticipantId] = useState(participants[0]?.id || '');
    const [lessEngagedParticipantId, setLessEngagedParticipantId] = useState(participants[0]?.id || '');
    const [ahaMoment, setAhaMoment] = useState('');
    const [biggestChallenge, setBiggestChallenge] = useState('');
    const [overallSuccess, setOverallSuccess] = useState(3);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const proactiveParticipant = participants.find(p => p.id === proactiveParticipantId);
        const lessEngagedParticipant = participants.find(p => p.id === lessEngagedParticipantId);

        if (!proactiveParticipant || !lessEngagedParticipant) {
            alert("Please select participants for evaluation.");
            return;
        }

        setIsSubmitting(true);
        await onSubmit({
            proactiveParticipantId,
            proactiveParticipantName: proactiveParticipant.name,
            lessEngagedParticipantId,
            lessEngagedParticipantName: lessEngagedParticipant.name,
            ahaMoment,
            biggestChallenge,
            overallSuccess,
        });
        setIsSubmitting(false);
    };

    if (participants.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md border text-center">
                <h3 className="text-xl font-bold mb-2">Submit Host Reflection</h3>
                <p className="text-gray-500">There were no participants in this session to evaluate.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Submit Host Reflection</h3>
            <p className="text-sm text-gray-600 mb-6">Please provide your insights from the session.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="flex justify-end pt-4">
                     <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-700 disabled:bg-primary-300">
                        {isSubmitting ? 'Submitting...' : 'Submit Reflection'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const SessionDetailPage: React.FC = () => {
    const { workshopId, sessionId } = useParams<{ workshopId: string, sessionId: string }>();
    const { allWorkshops, updateSession, currentUser, isLoading, updateSessionInState } = useContext(AppContext) as AppContextType;
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState<Tab>('details');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

    const { workshop, session } = useMemo(() => {
        if (!workshopId || !sessionId || allWorkshops.length === 0) {
            return { workshop: null, session: null };
        }
        const ws = allWorkshops.find(w => w.id === workshopId);
        if (!ws) return { workshop: null, session: null };
        const s = ws.sessions.find(s => s.id === sessionId);
        return { workshop: ws, session: s || null };
    }, [allWorkshops, workshopId, sessionId]);

    const activeUser = useMemo(() => {
        if (currentUser?.role === 'manager') return currentUser;
        const storedHostSession = sessionStorage.getItem('host_session');
        if (storedHostSession) {
            try {
                const hostUser: CurrentUser = JSON.parse(storedHostSession);
                if (hostUser.role === 'host' && hostUser.workshopId === workshopId) {
                    return hostUser;
                }
            } catch (e) {
                return null;
            }
        }
        return null;
    }, [currentUser, workshopId]);
    
    useEffect(() => {
        if (isLoading) return; // Wait for initial app loading to complete

        if (activeUser) {
            setIsAuthorized(true);
        } else if (allWorkshops.length > 0) {
            // If not authorized and data is loaded, redirect
            setIsAuthorized(false);
            navigate(`/host/workshop/${workshopId}/login`, { replace: true });
        }
    }, [isLoading, activeUser, allWorkshops.length, workshopId, navigate]);


    const [formData, setFormData] = useState({
        title: '',
        date: '',
        start_time: '',
        end_time: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [initialTabSet, setInitialTabSet] = useState(false);

    useEffect(() => {
        if (session && !initialTabSet) {
            setFormData({
                title: session.title,
                date: session.date,
                start_time: session.start_time,
                end_time: session.end_time,
            });
            setActiveTab(session.status === 'ended' ? 'attendance' : 'details');
            setInitialTabSet(true);
        }
    }, [session, initialTabSet]);
    
    // Fetch chat history for ended sessions
    useEffect(() => {
        if (session?.status === 'ended' && sessionId) {
            const fetchChat = async () => {
                const { data, error } = await supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at');
                if (error) {
                    console.error("Error fetching chat history:", error);
                } else {
                    setChatMessages(data || []);
                }
            };
            fetchChat();
        }
    }, [session, sessionId]);

    // Listen for real-time session updates to sync state
    useEffect(() => {
        if (!session) return;

        const channel = supabase.channel(`session-details-${session.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'sessions',
                filter: `id=eq.${session.id}`
            }, (payload) => {
                const updatedSession = payload.new as Session;
                // The subscription's only job is to update the global state.
                updateSessionInState({ ...session, ...updatedSession });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session, updateSessionInState]);

    // React to session status changes to handle redirection
    useEffect(() => {
        if (session?.status === 'live' && activeUser) {
            // A user is on this page and the session just went live. Redirect them.
            sessionStorage.setItem('workshop_session_user', JSON.stringify({
                id: activeUser.id,
                name: activeUser.name,
                email: activeUser.email,
                role: activeUser.role,
            }));
            navigate(`/session/${session.id}/live`, { replace: true });
        }
    }, [session?.status, activeUser, navigate, session?.id]);
    
    if (isLoading || !workshop || !session) {
        return <div className="p-10 text-center">Loading session...</div>;
    }

    if (!isAuthorized) {
        return <div className="p-10 text-center">Verifying authorization...</div>;
    }
    
    const shareableLink = `${window.location.origin}${window.location.pathname.split('#')[0]}#/session/${session.id}/join`;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;
        setIsSaving(true);
        try {
            await updateSession({ ...session, ...formData });
            alert('Session details saved successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to save session details.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGoLive = async () => {
        if (session && activeUser) {
            // Clear previous chat history for a clean slate
            const { error: deleteError } = await supabase
                .from('chat_messages')
                .delete()
                .eq('session_id', session.id);
            
            if (deleteError) {
                console.error("Failed to clear chat history:", deleteError);
                alert("Could not start session cleanly. Please try again.");
                return; // Stop if clearing fails
            }

            await updateSession({ ...session, status: 'live' });
            // The navigation will now be handled by the useEffect that listens for status changes
        }
    };

    const handleSubmitReflection = async (reflection: HostReflection) => {
        if (!session) return;
        try {
            await updateSession({
                ...session,
                host_reflection: reflection,
            });
            alert('Reflection submitted successfully!');
        } catch (error: any) {
            console.error("Failed to save reflection:", error);
            alert(`Error: Could not save reflection. Details: ${error.message}`);
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
                {activeUser?.role === 'manager' && (
                    <Link to={`/workshop/${workshopId}`} className="text-sm font-medium text-primary hover:text-primary-700">&larr; Back to Workshop</Link>
                )}
                 {activeUser?.role === 'host' && (
                    <Link to={`/host/workshop/${workshopId}/dashboard`} className="text-sm font-medium text-primary hover:text-primary-700">&larr; Back to Host Dashboard</Link>
                )}
                <h1 className="text-3xl font-bold text-gray-900 mt-2">{session.title}</h1>
                <p className="text-lg text-gray-600">{workshop.title}</p>
                 <div className="flex items-center text-md text-gray-500 mt-2 space-x-4">
                    <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-1.5" />
                        <span>{new Date(session.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center">
                        <ClockIcon className="h-5 w-5 mr-1.5" />
                        <span>{session.start_time} - {session.end_time}</span>
                    </div>
                </div>
            </div>

            {session.status !== 'ended' && (
                <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                    <label htmlFor="share-link" className="block text-sm font-medium text-gray-700 mb-1">Shareable Join Link (for Participants)</label>
                    <div className="relative">
                        <input
                            type="text"
                            id="share-link"
                            readOnly
                            value={shareableLink}
                            onClick={(e) => {
                                (e.target as HTMLInputElement).select();
                                navigator.clipboard.writeText(shareableLink).then(() => alert('Link copied to clipboard!'));
                            }}
                            className="block w-full text-sm text-primary-700 bg-white rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary cursor-pointer pr-10"
                            aria-label="Shareable session join link"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ClipboardIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                    </div>
                </div>
            )}

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('details')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Details
                    </button>
                    {session.status !== 'ended' && (
                         <button onClick={() => setActiveTab('go-live')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'go-live' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Go Live
                        </button>
                    )}
                    {session.status === 'ended' && (
                        <>
                            <button onClick={() => setActiveTab('attendance')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'attendance' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                Attendance
                            </button>
                             <button onClick={() => setActiveTab('reflection')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'reflection' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                Host Reflection
                            </button>
                            <button onClick={() => setActiveTab('chat')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'chat' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                Chat History
                            </button>
                        </>
                    )}
                </nav>
            </div>
            
            <div className="mt-8">
                {activeTab === 'details' && (
                    <div className="bg-white p-6 rounded-lg shadow-md border">
                        <h3 className="text-xl font-bold mb-4">Edit Session Details</h3>
                        <form onSubmit={handleSaveChanges} className="space-y-4">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Session Title</label>
                                <input type="text" id="title" value={formData.title} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                                    <input type="date" id="date" value={formData.date} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">Start Time</label>
                                    <input type="time" id="start_time" value={formData.start_time} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">End Time</label>
                                    <input type="time" id="end_time" value={formData.end_time} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-700 disabled:bg-primary-300">
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                {activeTab === 'go-live' && (
                     <div className="bg-white p-8 rounded-lg shadow-md border text-center">
                        <h3 className="text-2xl font-bold mb-4">Ready to Start?</h3>
                        <p className="text-gray-600 mb-6">This will mark the session as 'live' and allow participants to join.</p>
                        <button onClick={handleGoLive} className="px-8 py-4 text-lg font-bold text-white bg-green-600 rounded-md hover:bg-green-700 transition-transform hover:scale-105">
                            Go Live Now
                        </button>
                    </div>
                )}
                {activeTab === 'attendance' && (
                    <div className="bg-white p-6 rounded-lg shadow-md border">
                        <h3 className="text-xl font-bold mb-4">Attendance Report</h3>
                         <ul className="divide-y">
                            {workshop.participants.map(p => {
                                const record = session.session_participant_records.find(r => r.participant_id === p.id);
                                const isPresent = record?.attendance === 'present';
                                return (
                                    <li key={p.id} className="p-3 flex items-center justify-between">
                                        <div>
                                           <p className="font-medium text-gray-800">{p.name}</p>
                                           <p className="text-sm text-gray-500">{p.email}</p>
                                        </div>
                                        {isPresent ? (
                                            <span className="px-2 py-0.5 text-xs font-medium text-green-800 bg-green-100 rounded-full">Present</span>
                                        ) : (
                                            <span className="px-2 py-0.5 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">Absent</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
                {activeTab === 'reflection' && (
                    session.host_reflection ? (
                        <div className="bg-white p-6 rounded-lg shadow-md border">
                            <h3 className="text-xl font-bold mb-4">Host Reflection Summary</h3>
                            <dl className="space-y-4">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Most proactive participant</dt>
                                    <dd className="mt-1 text-md text-gray-900">{session.host_reflection.proactiveParticipantName}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Least engaged participant</dt>
                                    <dd className="mt-1 text-md text-gray-900">{session.host_reflection.lessEngagedParticipantName}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Most significant "aha moment"</dt>
                                    <dd className="mt-1 text-md text-gray-900 whitespace-pre-wrap">{session.host_reflection.ahaMoment}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Biggest challenge</dt>
                                    <dd className="mt-1 text-md text-gray-900 whitespace-pre-wrap">{session.host_reflection.biggestChallenge}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Overall success rating</dt>
                                    <dd className="mt-1 text-md text-gray-900">{session.host_reflection.overallSuccess} / 5</dd>
                                </div>
                            </dl>
                        </div>
                    ) : (
                        <HostReflectionForm
                            participants={workshop.participants}
                            onSubmit={handleSubmitReflection}
                        />
                    )
                )}
                 {activeTab === 'chat' && session.status === 'ended' && activeUser && (
                    <div className="h-[60vh]">
                        <ChatPanel 
                            chat={chatMessages}
                            currentUser={activeUser}
                            onSend={() => {}} // onSend is a no-op in read-only mode
                            isReadOnly={true}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SessionDetailPage;
