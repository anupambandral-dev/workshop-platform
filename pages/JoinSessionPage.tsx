import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import type { Workshop, AppContextType, Session, Participant, SessionWithRecords } from '../types';
import { LogoIcon } from '../components/Icons';

const JoinSessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { workshops, updateSession } = useContext(AppContext) as AppContextType;

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const { workshop, session } = useMemo(() => {
        if (!sessionId || workshops.length === 0) {
            return { workshop: null, session: null };
        }
        for (const ws of workshops) {
            const s = ws.sessions.find(s => s.id === sessionId);
            if (s) {
                return { workshop: ws, session: s };
            }
        }
        return { workshop: null, session: null };
    }, [sessionId, workshops]);
    
    useEffect(() => {
       if (workshops.length > 0) {
           setIsLoading(false);
           if (!session) {
               setError("Session not found.");
           }
       }
    }, [workshops, session]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!workshop || !session) {
            setError('Could not find session details.');
            return;
        }

        const participant = workshop.participants.find(p => p.email.toLowerCase() === email.toLowerCase());
        
        if (participant) {
            if (session.status !== 'live') {
                setError('The host has not started the session yet. Please wait and try again.');
                return;
            }

            // Mark attendance
            const updatedRecords = session.session_participant_records.map(r => 
                r.participant_id === participant.id ? { ...r, attendance: 'present' as const } : r
            );
            await updateSession({ ...session, session_participant_records: updatedRecords });
            
            sessionStorage.setItem('workshop_session_user', JSON.stringify({
                id: participant.id,
                name: participant.name,
                email: participant.email,
                role: 'participant',
            }));

            navigate(`/session/${sessionId}/live`);
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

    if (session.status === 'ended') {
        return (
             <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4 text-center">
                 <LogoIcon className="mx-auto h-12 w-auto text-primary" />
                 <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{workshop.title}</h2>
                 <p className="mt-2 text-xl text-gray-800">{session.title}</p>
                 <p className="mt-4 text-lg text-gray-600">This session has already ended.</p>
             </div>
        )
    }
    
    if (session.status === 'scheduled') {
        return (
             <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4 text-center">
                 <LogoIcon className="mx-auto h-12 w-auto text-primary" />
                 <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{workshop.title}</h2>
                 <p className="mt-2 text-xl text-gray-800">{session.title}</p>
                 <p className="mt-8 text-2xl text-gray-600 animate-pulse">The host has not started the session yet.</p>
                 <p className="mt-2 text-gray-500">Please wait and this page will update automatically.</p>
             </div>
        );
    }

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
                <form className="mt-8 space-y-6 bg-white p-8 shadow-lg rounded-lg" onSubmit={handleJoin}>
                    <p className="text-center text-sm text-gray-600">
                        Enter your registered email address to mark your attendance and join.
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
                            Join Session
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JoinSessionPage;