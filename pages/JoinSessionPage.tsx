import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import type { Workshop, AppContextType, Session, Participant, SessionWithRecords, SessionParticipantRecord } from '../types';
import { LogoIcon } from '../components/Icons';
import { supabase } from '../services/supabase';

const JoinSessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { allWorkshops } = useContext(AppContext) as AppContextType;

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    const [view, setView] = useState<'email_input' | 'status_view'>('email_input');
    const [identifiedParticipant, setIdentifiedParticipant] = useState<{ workshop: Workshop, session: SessionWithRecords, participant: Participant, record: SessionParticipantRecord } | null>(null);

    const intervalRef = useRef<number | null>(null);

    const { workshop, session } = useMemo(() => {
        if (!sessionId || allWorkshops.length === 0) {
            return { workshop: null, session: null };
        }
        for (const ws of allWorkshops) {
            const s = ws.sessions.find(s => s.id === sessionId);
            if (s) {
                return { workshop: ws, session: s };
            }
        }
        return { workshop: null, session: null };
    }, [sessionId, allWorkshops]);
    
    useEffect(() => {
       if (allWorkshops.length > 0) {
           setIsLoading(false);
           if (!session) {
               setError("Session not found.");
           }
       }
    }, [allWorkshops, session]);

    // Polling for session status on the waiting page
    useEffect(() => {
        const stopPolling = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        if (view !== 'status_view' || !session || session.status !== 'scheduled') {
            stopPolling();
            return;
        }

        const pollSessionStatus = async () => {
            if (!sessionStorage.getItem('waiting_participant_info')) {
                stopPolling();
                return;
            }

            try {
                const { data, error } = await supabase.functions.invoke('get-session-status', {
                    body: { sessionId: session.id },
                });

                if (error) {
                    console.error('Polling error:', error);
                    return;
                }
                
                if (data?.status === 'live') {
                    stopPolling();
                    
                    const waitingInfoRaw = sessionStorage.getItem('waiting_participant_info');
                    if (!waitingInfoRaw) return;

                    const waitingInfo = JSON.parse(waitingInfoRaw);
                    if (waitingInfo.sessionId !== session.id) return;

                    // Attendance is now marked on the LiveSessionPage
                    sessionStorage.setItem('workshop_session_user', JSON.stringify({
                        id: waitingInfo.id,
                        name: waitingInfo.name,
                        email: waitingInfo.email,
                        role: 'participant',
                    }));
                    sessionStorage.removeItem('waiting_participant_info');
                    navigate(`/session/${sessionId}/live`);
                }
            } catch (err) {
                console.error("Error during status poll transition:", err);
            }
        };

        intervalRef.current = setInterval(pollSessionStatus, 3000);
        pollSessionStatus();

        return () => {
            stopPolling();
        };
    }, [view, session, sessionId, navigate]);


    const handleIdentify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!workshop || !session) {
            setError('Could not find session details.');
            return;
        }

        const participant = workshop.participants.find(p => p.email.toLowerCase() === email.toLowerCase());
        const record = participant ? session.session_participant_records.find(r => r.participant_id === participant.id) : undefined;
        
        if (participant && record) {
            const participantData = { workshop, session, participant, record };
            setIdentifiedParticipant(participantData);
            
            if (session.status === 'live') {
                // Attendance is now marked on the LiveSessionPage
                sessionStorage.setItem('workshop_session_user', JSON.stringify({
                    id: participant.id,
                    name: participant.name,
                    email: participant.email,
                    role: 'participant',
                }));
                navigate(`/session/${sessionId}/live`);
            } else {
                sessionStorage.setItem('waiting_participant_info', JSON.stringify({
                    sessionId: session.id,
                    email: participant.email,
                    id: participant.id,
                    name: participant.name,
                }));
                setView('status_view');
            }
        } else {
            setError('This email is not registered for this workshop. Please check the email and try again.');
        }
    };

    if (isLoading) {
        return <div className="text-center p-10">Loading session details...</div>;
    }
    
    if (!workshop || !session) {
        return <div className="text-center p-10 text-red-500">Error: {error || "Could not load session."}</div>
    }

    if (view === 'email_input') {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4">
                <div className="w-full max-w-md space-y-8">
                    <div>
                        <LogoIcon className="mx-auto h-12 w-auto text-primary" />
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Join Session
                        </h2>
                        <p className="mt-2 text-center text-lg text-gray-600">
                            {workshop.title} - {session.title}
                        </p>
                    </div>
                    <form className="mt-8 space-y-6 bg-white p-8 shadow-lg rounded-lg" onSubmit={handleIdentify}>
                        <p className="text-center text-sm text-gray-600">
                            Please enter your registered email address to continue.
                        </p>
                        <div className="rounded-md shadow-sm">
                            <div>
                                <label htmlFor="email-address" className="sr-only">Email address</label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                        <div>
                            <button
                                type="submit"
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                Continue
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (view === 'status_view' && identifiedParticipant) {
        const { workshop, session, record } = identifiedParticipant;
        
        if (session.status === 'scheduled') {
            return (
                 <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4">
                    <div className="w-full max-w-lg text-center bg-white p-10 shadow-lg rounded-lg">
                        <LogoIcon className="mx-auto h-12 w-auto text-primary" />
                        <h2 className="mt-6 text-3xl font-bold text-gray-900">{workshop.title}</h2>
                        <p className="mt-2 text-xl text-gray-700">{session.title}</p>
                        
                        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}

                        <div className="mt-8">
                            <div className="flex justify-center items-center space-x-2">
                                <div className="w-3 h-3 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                <div className="w-3 h-3 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                            </div>
                            <p className="mt-4 text-2xl font-semibold text-gray-800">You're in the waiting room</p>
                            <p className="mt-2 text-gray-600">The session will begin shortly. Please wait for the host to start.</p>
                            <p className="mt-1 text-sm text-gray-500">This page will update automatically.</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (session.status === 'ended') {
            const attended = record.attendance === 'present';
            return (
                 <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4 text-center">
                     <LogoIcon className="mx-auto h-12 w-auto text-primary" />
                     <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{workshop.title}</h2>
                     <p className="mt-2 text-xl text-gray-800">{session.title}</p>
                     <p className="mt-4 text-lg text-gray-600">This session has already ended.</p>
                     {attended && (
                         <div className="mt-8">
                            <p className="text-gray-700 mb-4">Thank you for your participation!</p>
                            <a 
                                href="https://echogb.typeform.com/to/cY2oFNyx" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-6 py-3 text-base font-medium text-white bg-primary rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                Provide Feedback
                            </a>
                         </div>
                     )}
                 </div>
            );
        }
    }

    return <div className="text-center p-10">Loading...</div>;
};

export default JoinSessionPage;
