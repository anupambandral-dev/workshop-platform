import React, { useContext, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { AppContextType } from '../types';
import { CalendarIcon, ClockIcon, UsersIcon, ClipboardIcon } from '../components/Icons';

const WorkshopDetailPage: React.FC = () => {
    const { workshopId } = useParams<{ workshopId: string }>();
    const { workshops } = useContext(AppContext) as AppContextType;
    const navigate = useNavigate();

    const workshop = useMemo(() => workshops.find(ws => ws.id === workshopId), [workshops, workshopId]);

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
    
    const ShareableLink: React.FC<{ label: string, link: string }> = ({ label, link }) => (
         <div className="mt-2">
            <label className="block text-sm font-medium text-gray-600">{label}</label>
            <div className="relative">
                 <input
                    type="text"
                    readOnly
                    value={link}
                    onClick={(e) => {
                        (e.target as HTMLInputElement).select();
                        navigator.clipboard.writeText(link).then(() => alert('Link copied!'));
                    }}
                    className="mt-1 block w-full text-sm text-primary-700 bg-white rounded-md border-gray-300 focus:ring-primary focus:border-primary cursor-pointer pr-10"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ClipboardIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
            </div>
        </div>
    );

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
            
            <div>
                <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">Sessions</h2>
                <div className="space-y-6">
                    {workshop.sessions.map(session => {
                        const participantLink = `${window.location.origin}${window.location.pathname.split('#')[0]}#/session/${session.id}/join`;
                        const hostLink = `${window.location.origin}${window.location.pathname.split('#')[0]}#/host/session/${session.id}/login`;
                        
                        return (
                            <div key={session.id} className="bg-white p-4 rounded-lg shadow-sm border">
                                <div 
                                    onClick={() => navigate(`/workshop/${workshop.id}/session/${session.id}`)}
                                    className="flex justify-between items-center cursor-pointer"
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
                                {session.status !== 'ended' && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <ShareableLink label="Participant Join Link" link={participantLink} />
                                         <ShareableLink label="Host Login Link" link={hostLink} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default WorkshopDetailPage;