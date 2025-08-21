import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import type { AppContextType, Workshop, Employee } from '../types';
import { PlusIcon, UsersIcon, CalendarIcon, ClockIcon, XMarkIcon, TrashIcon, ExclamationTriangleIcon } from '../components/Icons';
import { useNavigate } from 'react-router-dom';
import UserSearchModal from '../components/UserSearchModal';

const WorkshopCard: React.FC<{ workshop: Workshop, onDelete: () => void, canDelete: boolean }> = ({ workshop, onDelete, canDelete }) => {
    const navigate = useNavigate();
    
    const nextSession = useMemo(() => 
        [...workshop.sessions]
            .filter(s => s.status !== 'ended')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0],
    [workshop.sessions]);

    const status = nextSession ? (nextSession.status === 'live' ? 'live' : 'scheduled') : 'ended';
    
    const completedSessions = useMemo(() => 
        workshop.sessions.filter(s => s.status === 'ended').length,
    [workshop.sessions]);
    
    const totalSessions = workshop.sessions.length;
    const progressPercentage = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    const getStatusChip = (status: 'scheduled' | 'live' | 'ended') => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-800';
            case 'live': return 'bg-green-100 text-green-800 animate-pulse';
            case 'ended': return 'bg-gray-100 text-gray-800';
        }
    };
    
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
    };

    return (
        <div 
            onClick={() => navigate(`/workshop/${workshop.id}`)}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border border-gray-200 flex flex-col justify-between relative group"
        >
            {canDelete && (
                <button 
                    onClick={handleDelete}
                    className="absolute top-4 right-4 p-1.5 bg-gray-100 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label="Delete workshop"
                >
                    <TrashIcon className="h-5 w-5" />
                </button>
            )}

            <div>
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-800 mb-2 pr-10">{workshop.title}</h3>
                     <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusChip(status)}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </div>
                <div className="space-y-2 text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1.5" />
                        <span>{workshop.sessions.length} sessions hosted by {workshop.hosts.map(h => h.name).join(', ')}</span>
                    </div>
                     {nextSession && (
                        <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1.5" />
                            <span>Next: {new Date(nextSession.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} at {nextSession.start_time}</span>
                        </div>
                    )}
                    <div className="flex items-center">
                        <UsersIcon className="h-4 w-4 mr-1.5" />
                        <span>{workshop.participants.length} participants</span>
                    </div>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{completedSessions} / {totalSessions} Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className="bg-primary h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

const CreateWorkshopModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { addWorkshop, employees } = useContext(AppContext) as AppContextType;
    const [title, setTitle] = useState('');
    const [totalSessions, setTotalSessions] = useState(1);
    const [weekday, setWeekday] = useState('1'); // Monday
    const [time, setTime] = useState('10:00');
    
    const [selectedHosts, setSelectedHosts] = useState<Employee[]>([]);
    const [selectedParticipants, setSelectedParticipants] = useState<Employee[]>([]);
    
    const [isHostModalOpen, setIsHostModalOpen] = useState(false);
    const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
    
    const [isCreating, setIsCreating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        const workshopData = { title, total_sessions: totalSessions, weekday, time };
        
        try {
            // CRITICAL FIX: Pass the full Employee objects
            await addWorkshop(workshopData, selectedHosts, selectedParticipants);
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to create workshop.");
        } finally {
            setIsCreating(false);
        }
    };

    const UserTag: React.FC<{ user: Employee, onRemove: () => void }> = ({ user, onRemove }) => (
        <span className="inline-flex items-center gap-x-2 rounded-md bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700">
            {user.name}
            <button type="button" onClick={onRemove} className="group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-gray-500/20">
                <span className="sr-only">Remove</span>
                <XMarkIcon className="h-3.5 w-3.5 text-gray-500 group-hover:text-gray-700" />
            </button>
        </span>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 sticky top-0 bg-white z-10">
                        <h2 className="text-2xl font-bold text-gray-900">Create New Workshop</h2>
                        <p className="mt-1 text-sm text-gray-600">Fill in the details below to schedule a new workshop series.</p>
                    </div>
                    <div className="px-6 py-4 space-y-6 border-t border-b border-gray-200">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Workshop Title</label>
                            <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="totalSessions" className="block text-sm font-medium text-gray-700">Total number of sessions</label>
                                <input type="number" id="totalSessions" value={totalSessions} min="1" onChange={e => setTotalSessions(parseInt(e.target.value, 10))} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="weekday" className="block text-sm font-medium text-gray-700">Day of the week</label>
                                <select id="weekday" value={weekday} onChange={e => setWeekday(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                                    <option value="1">Monday</option>
                                    <option value="2">Tuesday</option>
                                    <option value="3">Wednesday</option>
                                    <option value="4">Thursday</option>
                                    <option value="5">Friday</option>
                                    <option value="6">Saturday</option>
                                    <option value="0">Sunday</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="time" className="block text-sm font-medium text-gray-700">Time</label>
                                <input type="time" id="time" value={time} onChange={e => setTime(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                            </div>
                        </div>

                        <fieldset className="border-t border-gray-200 pt-4">
                            <legend className="text-lg font-medium text-gray-900">Hosts</legend>
                            <div className="mt-2 p-2 min-h-[50px] bg-gray-50 rounded-md border flex flex-wrap gap-2">
                                {selectedHosts.map(host => <UserTag key={host.id} user={host} onRemove={() => setSelectedHosts(selectedHosts.filter(h => h.id !== host.id))} />)}
                            </div>
                            <button type="button" onClick={() => setIsHostModalOpen(true)} className="mt-2 text-sm font-medium text-primary hover:text-primary-700 flex items-center">
                                <PlusIcon className="h-4 w-4 mr-1" /> Add Host
                            </button>
                        </fieldset>

                         <fieldset className="border-t border-gray-200 pt-4">
                            <legend className="text-lg font-medium text-gray-900">Participants</legend>
                             <div className="mt-2 p-2 min-h-[50px] bg-gray-50 rounded-md border flex flex-wrap gap-2">
                                {selectedParticipants.map(p => <UserTag key={p.id} user={p} onRemove={() => setSelectedParticipants(selectedParticipants.filter(sp => sp.id !== p.id))} />)}
                            </div>
                            <button type="button" onClick={() => setIsParticipantModalOpen(true)} className="mt-2 text-sm font-medium text-primary hover:text-primary-700 flex items-center">
                                <PlusIcon className="h-4 w-4 mr-1" /> Add Participant
                            </button>
                        </fieldset>
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end space-x-3 sticky bottom-0 z-10">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">Cancel</button>
                        <button type="submit" disabled={isCreating} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300">
                            {isCreating ? 'Creating...' : 'Create Workshop'}
                        </button>
                    </div>
                </form>
            </div>
            {isHostModalOpen && (
                <UserSearchModal 
                    allUsers={employees}
                    alreadySelected={selectedHosts.concat(selectedParticipants)}
                    onClose={() => setIsHostModalOpen(false)}
                    onSelect={(user) => {
                        setSelectedHosts([...selectedHosts, user]);
                        setIsHostModalOpen(false);
                    }}
                    title="Add Host"
                />
            )}
             {isParticipantModalOpen && (
                <UserSearchModal 
                    allUsers={employees}
                    alreadySelected={selectedHosts.concat(selectedParticipants)}
                    onClose={() => setIsParticipantModalOpen(false)}
                    onSelect={(user) => {
                        setSelectedParticipants([...selectedParticipants, user]);
                        setIsParticipantModalOpen(false);
                    }}
                    title="Add Participant"
                />
            )}
        </div>
    );
};

const DeleteWorkshopModal: React.FC<{
    workshop: Workshop;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}> = ({ workshop, onClose, onConfirm, isDeleting }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 flex">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                        <h3 className="text-lg font-semibold leading-6 text-gray-900">Delete Workshop</h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                Are you sure you want to permanently delete the workshop{' '}
                                <strong className="font-medium text-gray-800">"{workshop.title}"</strong>? All of its sessions and data will be removed. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:bg-red-300"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const DashboardPage: React.FC = () => {
    const { workshops, isLoading, user, deleteWorkshop } = useContext(AppContext) as AppContextType;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [workshopToDelete, setWorkshopToDelete] = useState<Workshop | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isManager = user?.role === 'manager';

    const { currentAndUpcoming, previous } = useMemo(() => {
        const sortedWorkshops = [...workshops].sort((a, b) => {
            const dateA = new Date(a.sessions[0]?.date || 0).getTime();
            const dateB = new Date(b.sessions[0]?.date || 0).getTime();
            return dateB - dateA;
        });
        return {
            currentAndUpcoming: sortedWorkshops.filter(ws => ws.sessions.some(s => s.status !== 'ended')),
            previous: sortedWorkshops.filter(ws => ws.sessions.every(s => s.status === 'ended'))
        };
    }, [workshops]);

    const handleConfirmDelete = async () => {
        if (!workshopToDelete) return;
        setIsDeleting(true);
        try {
            await deleteWorkshop(workshopToDelete.id);
            setWorkshopToDelete(null);
        } catch (error) {
            console.error("Failed to delete workshop on page:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return <div className="text-center p-10">Loading workshops...</div>;
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{isManager ? 'Manager Dashboard' : 'My Assigned Workshops'}</h1>
                    <p className="mt-1 text-lg text-gray-600">Welcome back, {user?.name}!</p>
                </div>
                {isManager && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create Workshop
                    </button>
                )}
            </div>

            {isModalOpen && <CreateWorkshopModal onClose={() => setIsModalOpen(false)} />}
            
            {workshopToDelete && (
                <DeleteWorkshopModal 
                    workshop={workshopToDelete}
                    onClose={() => setWorkshopToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    isDeleting={isDeleting}
                />
            )}
            
            <div className="space-y-12">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">Current & Upcoming</h2>
                    {currentAndUpcoming.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {currentAndUpcoming.map(ws => <WorkshopCard key={ws.id} workshop={ws} onDelete={() => setWorkshopToDelete(ws)} canDelete={isManager} />)}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white rounded-lg shadow-md border">
                            <p className="text-gray-500">No current or upcoming workshops.</p>
                             {isManager && <button onClick={() => setIsModalOpen(true)} className="mt-4 text-sm font-medium text-primary hover:text-primary-700">Create your first workshop</button>}
                        </div>
                    )}
                </div>

                <div>
                    <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">Previous Workshops</h2>
                    {previous.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {previous.map(ws => <WorkshopCard key={ws.id} workshop={ws} onDelete={() => setWorkshopToDelete(ws)} canDelete={isManager} />)}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white rounded-lg shadow-md border">
                            <p className="text-gray-500">No previously completed workshops.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;