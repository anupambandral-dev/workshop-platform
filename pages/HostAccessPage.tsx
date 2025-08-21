import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import type { Workshop, AppContextType, HostSession } from '../types';
import { LogoIcon } from '../components/Icons';

const HostAccessPage: React.FC = () => {
    const { workshopId } = useParams<{ workshopId: string }>();
    const navigate = useNavigate();
    const { workshops, isLoading: isAppLoading } = useContext(AppContext) as AppContextType;

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const workshop = useMemo(() => workshops.find(ws => ws.id === workshopId), [workshops, workshopId]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsVerifying(true);
        if (!workshop) {
            setError('Workshop not found.');
            setIsVerifying(false);
            return;
        }

        const host = workshop.hosts.find(h => h.email.toLowerCase() === email.toLowerCase());
        
        if (host) {
            // Grant temporary access
            const hostSession: HostSession = {
                workshopId: workshop.id,
                hostEmail: host.email,
                hostName: host.name
            };
            sessionStorage.setItem('workshop_host_session', JSON.stringify(hostSession));
            
            // Redirect to the workshop detail page
            navigate(`/workshop/${workshopId}`);

        } else {
            setError('This email is not registered as a host for this workshop.');
        }
        setIsVerifying(false);
    };

    if (isAppLoading) {
        return <div className="text-center p-10">Loading workshop...</div>;
    }
    
    if (!workshop) {
        return <div className="text-center p-10 text-red-500">Error: Could not load workshop details. The link may be invalid.</div>
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <LogoIcon className="mx-auto h-12 w-auto text-primary" />
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Host Access
                    </h2>
                    <p className="mt-2 text-center text-lg text-gray-600">
                        {workshop.title}
                    </p>
                </div>
                <form className="mt-8 space-y-6 bg-white p-8 shadow-lg rounded-lg" onSubmit={handleVerify}>
                    <p className="text-center text-sm text-gray-600">
                        Please enter your host email address to access the workshop management page.
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
                            disabled={isVerifying}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                        >
                            {isVerifying ? 'Verifying...' : 'Continue as Host'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HostAccessPage;
