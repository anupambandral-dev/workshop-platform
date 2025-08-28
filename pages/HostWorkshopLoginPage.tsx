import React, { useState, useMemo, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { AppContextType } from '../types';
import { LogoIcon } from '../components/Icons';

const HostWorkshopLoginPage: React.FC = () => {
    const { workshopId } = useParams<{ workshopId: string }>();
    const navigate = useNavigate();
    const { allWorkshops, setCurrentUser } = useContext(AppContext) as AppContextType;

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const workshop = useMemo(() => {
        if (!workshopId || allWorkshops.length === 0) return null;
        return allWorkshops.find(ws => ws.id === workshopId);
    }, [workshopId, allWorkshops]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!workshop) {
            setError("Workshop details not found. Please check the link.");
            setIsLoading(false);
            return;
        }

        const host = workshop.hosts.find(h => h.email?.toLowerCase() === email.toLowerCase());

        if (host) {
            // Success! Create temporary session for the host
            setCurrentUser({
                id: host.employee_id,
                name: host.name || 'Host',
                email: host.email || email,
                role: 'host' as const,
                workshopId: workshop.id, // Scope the session to this workshop
            });
            navigate(`/host/workshop/${workshop.id}/dashboard`);
        } else {
            setError("This email is not registered as a host for this workshop.");
        }

        setIsLoading(false);
    };
    
    if (allWorkshops.length > 0 && !workshop) {
        return (
            <div className="flex items-center justify-center min-h-screen text-center">
                <p className="text-xl text-red-600">Error: The workshop link is invalid or the workshop could not be found.</p>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 px-4">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <LogoIcon className="mx-auto h-12 w-auto text-primary" />
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Host Login
                    </h2>
                     {workshop ? (
                        <p className="mt-2 text-center text-lg text-gray-600">
                            {workshop.title}
                        </p>
                    ) : (
                         <p className="mt-2 text-center text-lg text-gray-600 animate-pulse">
                            Loading workshop details...
                        </p>
                    )}
                </div>
                <form className="mt-8 space-y-6 bg-white p-8 shadow-lg rounded-lg" onSubmit={handleLogin}>
                    <p className="text-center text-sm text-gray-600">
                        Please enter your host email address to manage the workshop.
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
                            disabled={isLoading || !workshop}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                        >
                            {isLoading ? 'Verifying...' : 'Continue as Host'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HostWorkshopLoginPage;