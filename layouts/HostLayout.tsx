import React, { useEffect, useState, useContext } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../App';
import { AppContextType, CurrentUser } from '../types';

const HostLayout: React.FC = () => {
    const { workshopId } = useParams<{ workshopId: string }>();
    const navigate = useNavigate();
    const { isLoading: isAppLoading } = useContext(AppContext) as AppContextType;
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Don't run the check until the main app has finished its initial load
        if (isAppLoading) {
            return;
        }

        let hostUser: CurrentUser | null = null;
        try {
            const stored = sessionStorage.getItem('host_session');
            if (stored) {
                hostUser = JSON.parse(stored);
            }
        } catch (e) {
            console.error("Failed to parse host session", e);
        }

        if (hostUser && hostUser.role === 'host' && hostUser.workshopId === workshopId) {
            setIsAuthorized(true);
        } else {
            setIsAuthorized(false);
            // Redirect to the specific login page for this workshop
            navigate(`/host/workshop/${workshopId}/login`, { replace: true });
        }
        setIsLoading(false);
        
    }, [workshopId, navigate, isAppLoading]);

    if (isLoading || isAppLoading) {
        return <div className="p-10 text-center">Verifying host access...</div>;
    }

    if (!isAuthorized) {
        // This view is shown briefly during the redirect.
        return <div className="p-10 text-center">Redirecting to login...</div>;
    }

    // If authorized, render the child route (e.g., HostWorkshopDashboardPage)
    return <Outlet />;
};

export default HostLayout;
