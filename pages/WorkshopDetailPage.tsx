import React, { useContext, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { AppContextType } from '../types';
import { CalendarIcon, ClockIcon, UsersIcon } from '../components/Icons';

const WorkshopDetailPage: React.FC = () => {
    const { workshopId } = useParams<{ workshopId: string }>();
    const { workshops } = useContext(AppContext) as AppContextType;
    const navigate = useNavigate();

    const workshop = useMemo(() => workshops.find(ws => ws.id === workshopId), [workshops, workshopId]);

    const nextUpcomingSession = useMemo(() => {
        if (!workshop) return null;
        return [...workshop.sessions]
            .filter(s => s.status !== 'ended')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    }, [workshop]);
    
    const participantLink = nextUpcomingSession ? `${window.location.origin}${window.location.pathname}#/session/${nextUpcomingSession.id}/join` : null;
    const hostLink = nextUpcomingSession ? `${participantLink}?role=host` : null;

    if (!workshop) {
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

    const copyToClipboard = (link: string, type: string) => {
      navigator.clipboard.writeText(link).then(() => alert(`${type} link copied!`));
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <Link to="/dashboard" className="text-sm font-medium text-primary hover:text-primary-700">&larr; Back to Dashboard</Link>
                <h1 className="text-3xl font-bold text-gray-900 mt-2">{workshop.title}</h1>
                <div className="flex items-center text-md text-gray-500 mt-2 space-x-4">
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
            
            {nextUpcomingSession && (
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <label htmlFor="participant-link" className="text-sm font-medium text-blue-800 block">Participant Link for Next Session ({nextUpcomingSession.title})</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                                type="text"
                                id="participant-link"
                                readOnly
                                value={participantLink || ''}
                                className="block w-full text-sm text-blue-900 bg-white rounded-none rounded-l-md border-blue-200 focus:ring-primary focus:border-primary cursor-pointer"
                            />
                            <button
                                type="button"
                                onClick={() => copyToClipboard(participantLink!, 'Participant')}
                                className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                            >
                                <span>Copy</span>
                            </button>
                        </div>
                    </div>
                     <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <label htmlFor="host-link" className="text-sm font-medium text-green-800 block">Host Link for Next Session ({nextUpcomingSession.title})</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                             <input
                                type="text"
                                id="host-link"
                                readOnly
                                value={hostLink || ''}
                                className="block w-full text-sm text-green-900 bg-white rounded-none rounded-l-md border-green-200 focus:ring-primary focus:border-primary cursor-pointer"
                            />
                            <button
                                type="button"
                                onClick={() => copyToClipboard(hostLink!, 'Host')}
                                className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-green-300 bg-green-100 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                            >
                                <span>Copy</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">Sessions</h2>
                <div className="space-y-4">
                    {workshop.sessions.map(session => (
                        <div 
                            key={session.id} 
                            onClick={() => navigate(`/workshop/${workshop.id}/session/${session.id}`)}
                            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border flex justify-between items-center"
                        >
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{session.title}</h3>
                                <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                                     <div className="flex items-center">
                                        <CalendarIcon className="h-4 w-4 mr-1.5" />
                                        <span>{new Date(session.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}</span>
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
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WorkshopDetailPage;
