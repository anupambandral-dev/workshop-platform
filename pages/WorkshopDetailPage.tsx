import React, { useContext, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { AppContextType, Employee } from '../types';
import { CalendarIcon, ClockIcon, UsersIcon, ClipboardIcon, PlusIcon } from '../components/Icons';
import UserSearchModal from '../components/UserSearchModal';

const WorkshopDetailPage: React.FC = () => {
    const { workshopId } = useParams<{ workshopId: string }>();
    const { workshops, currentUser, employees, addParticipantToWorkshop } = useContext(AppContext) as AppContextType;
    const navigate = useNavigate();

    const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);

    const workshop = useMemo(() => workshops.find(ws => ws.id === workshopId), [workshops, workshopId]);
    const isManager = currentUser?.role === 'manager';

    const handleAddParticipant = async (employee: Employee) => {
        if (!workshop) return;
        try {
            await addParticipantToWorkshop(workshop.id, employee);
            setIsParticipantModalOpen(false);
        } catch (error: any) {
            alert(`Failed to add participant: ${error.message}`);
        }
    };

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
    
    const hostLoginLink = `${window.location.origin}${window.location.pathname.split('#')[0]}#/host/workshop/${workshop.id}/login`;

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
             {isParticipantModalOpen && isManager && workshop && (
                <UserSearchModal 
                    allUsers={employees}
                    alreadySelected={[...workshop.participants, ...workshop.hosts]}
                    onClose={() => setIsParticipantModalOpen(false)}
                    onSelect={handleAddParticipant}
                    title="Add Participant to Workshop"
                />
            )}
            <div className="mb-8">
                <Link to="/dashboard" className="text-sm font-medium text-primary hover:text-primary-700">&larr; Back to Dashboard</Link>
                <h1 className="text-3xl font-bold text-gray-900 mt-2">{workshop.title}</h1>
                <div className="flex items-center text-md text-gray-500 mt-2 space-x-4">
                    <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-1.5" />
                        <span>{workshop.sessions.length} sessions</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                        <ShareableLink label="Host Login Link (for all sessions in this workshop)" link={hostLoginLink} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">Sessions</h2>
                        <div className="space-y-6">
                            {workshop.sessions.map(session => {
                                const participantLink = `${window.location.origin}${window.location.pathname.split('#')[0]}#/session/${session.id}/join`;
                                
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
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                 <ShareableLink label="Participant Join Link" link={participantLink} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1">
                     <div className="bg-white p-6 rounded-lg shadow-sm border sticky top-8">
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                                <UsersIcon className="h-6 w-6 mr-2 text-gray-500" />
                                Participants ({workshop.participants.length})
                            </h2>
                            {isManager && (
                                <button 
                                    onClick={() => setIsParticipantModalOpen(true)}
                                    className="p-1.5 bg-primary-50 text-primary rounded-full hover:bg-primary-100 transition-colors"
                                    aria-label="Add participant"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <ul className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {workshop.participants.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                <li key={p.id} className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 flex-shrink-0">
                                        <span className="text-sm font-bold text-gray-600">{p.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{p.name}</p>
                                        <p className="text-xs text-gray-500">{p.email}</p>
                                    </div>
                                </li>
                            ))}
                             {workshop.participants.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">No participants have been added yet.</p>
                             )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkshopDetailPage;
