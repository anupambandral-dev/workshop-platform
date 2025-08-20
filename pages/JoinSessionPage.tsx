import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { Workshop } from '../types';
import { LogoIcon } from '../components/Icons';

const JoinSessionPage: React.FC = () => {
    const { workshopId } = useParams<{ workshopId: string }>();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [workshop, setWorkshop] = useState<Workshop | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchWorkshop = async () => {
            if (!workshopId) {
                setError("Workshop ID is missing.");
                setIsLoading(false);
                return;
            }
            const { data, error } = await supabase
                .from('workshops')
                .select('*, participants(*), hosts(*)')
                .eq('id', workshopId)
                .single();

            if (error || !data) {
                setError("Workshop not found.");
            } else {
                setWorkshop(data as Workshop);
            }
            setIsLoading(false);
        };
        fetchWorkshop();
    }, [workshopId]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!workshop) {
            setError('Could not find workshop details.');
            return;
        }

        const participant = workshop.participants.find(p => p.email.toLowerCase() === email.toLowerCase());
        
        if (participant) {
            // Mark attendance
            const { error: updateError } = await supabase
                .from('participants')
                .update({ attendance: 'present' } as any)
                .eq('id', participant.id);

            if (updateError) {
                setError("Could not update attendance. Please try again.");
                return;
            }
            
            // If this is the first person to join, set the workshop status to live
            if (workshop.status === 'scheduled') {
                await supabase.from('workshops').update({ status: 'live' } as any).eq('id', workshop.id);
            }
            
            sessionStorage.setItem('workshop_session_user', JSON.stringify({
                id: participant.id,
                name: participant.name,
                email: participant.email,
                role: 'participant',
            }));

            navigate(`/session/${workshopId}/live`);
        } else {
            setError('This email is not registered for this workshop. Please check the email and try again.');
        }
    };

    if (isLoading || !workshop) {
        return <div className="text-center p-10">Loading session details...</div>;
    }

    if (workshop.status === 'ended') {
        return (
             <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4 text-center">
                 <LogoIcon className="mx-auto h-12 w-auto text-primary" />
                 <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{workshop.title}</h2>
                 <p className="mt-4 text-xl text-gray-600">This workshop has already ended.</p>
             </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <LogoIcon className="mx-auto h-12 w-auto text-primary" />
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Join Workshop
                    </h2>
                    <p className="mt-2 text-center text-lg text-gray-600">
                        {workshop.title}
                    </p>
                </div>
                <form className="mt-8 space-y-6 bg-white p-8 shadow-lg rounded-lg" onSubmit={handleJoin}>
                    <p className="text-center text-sm text-gray-600">
                        Enter your registered email address to mark your attendance and join the session.
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