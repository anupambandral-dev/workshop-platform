import React, { useContext, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { AppContextType } from '../types';
import { CalendarIcon, ClockIcon, UsersIcon } from '../components/Icons';

const HostWorkshopDashboardPage: React.FC = () => {
    const { workshopId } = useParams<{ workshopId: string }>();
    const { allWorkshops, logout, isLoading } = useContext(AppContext) as AppContextType;
    const navigate = useNavigate();

    const workshop = useMemo(() => allWorkshops.find(ws => ws.id === workshopId), [allWorkshops, workshopId]);

    // The security check is now handled by the parent HostLayout component.
    // This component can now safely assume it has access if it renders.

    if (isLoading || !workshop) {
        return <div className="p-10 text-center">Loading workshop details...</div>;
    }
    
    const getStatusChip = (status: 'scheduled' | 'live' | 'ended') => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-800';
            case 'live': return 'bg-green-100 text-green-800 animate-pulse';
            case 'ended': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                 <div>
                    <h1 className="text-3xl font-bold text-gray-900">{workshop.title}</h1>
                    <p className="mt-1 text-lg text-gray-600">Host Dashboard</p>
                </div>
                 <button
                    onClick={logout}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                    Logout
                </button>
            </div>
            
             <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Workshop Overview</h2>
                <div className="flex items-center text-md text-gray-600 mt-2 space-x-6">
                    <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-1.5" />
                        <span>{workshop.sessions.length} sessions</span>
                    </div>
                    <div className="flex items-center">
                        <UsersIcon className="h-5 w-5 mr-1.5" />
                        <span>{workshop.participants.length} participants</span>
                    </div>
                </div>
             </div>
            
            <div>
                <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">Manage Sessions</h2>
                <div className="space-y-6">
                    {workshop.sessions.map(session => (
                        <div 
                            key={session.id} 
                            onClick={() => navigate(`/workshop/${workshop.id}/session/${session.id}`)}
                            className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">{session.title}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                                        <div className="flex items-center">
                                            <CalendarIcon className="h-4 w-4 mr-1.5" />
                                            <span>{new Date(session.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <ClockIcon className="h-4 w-4 mr-1.5" />
                                            <span>{session.start_time}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusChip(session.status)}`}>
                                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                    </span>
                                    <span className="text-gray-400">&rarr;</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HostWorkshopDashboardPage;