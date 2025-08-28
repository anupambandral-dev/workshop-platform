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
    
    const [isHostSearchOpen, setIsHostSearchOpen] = useState(false);
    const [isParticipantSearchOpen, setIsParticipantSearchOpen] = useState(false);

    const [isCreating, setIsCreating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        const workshopData = { title, total_sessions: totalSessions, weekday, time };
        
        try {
            await addWorkshop(workshopData, selectedHosts, selectedParticipants);
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(`Failed to create workshop: ${error.message}`);
        } finally {
            setIsCreating(false);
        }
    };
    
    const renderSelectedUser = (user: Employee, onRemove: () => void) => (
        <div key={user.id} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
            <div>
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <button type="button" onClick={onRemove} className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-200">
                <XMarkIcon className="h-4 w-4" />
            </button>
        </div>
    );

    return (
        <>
            {isHostSearchOpen && (
                <UserSearchModal
                    allUsers={employees}
                    alreadySelected={[...selectedHosts, ...selectedParticipants]}
                    onClose={() => setIsHostSearchOpen(false)}
                    onSelect={(user) => {
                        setSelectedHosts([...selectedHosts, user]);
                        setIsHostSearchOpen(false);
                    }}
                    title="Select a Host"
                />
            )}
            {isParticipantSearchOpen && (
                <UserSearchModal
                    allUsers={employees}
                    alreadySelected={[...selectedHosts, ...selectedParticipants]}
                    onClose={() => setIsParticipantSearchOpen(false)}
                    onSelect={(user) => {
                        setSelectedParticipants([...selectedParticipants, user]);
                        setIsParticipantSearchOpen(false);
                    }}
                    title="Select a Participant"
                />
            )}

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
                                <div className="mt-2 space-y-2">
                                    {selectedHosts.map(host => renderSelectedUser(host, () => setSelectedHosts(prev => prev.filter(h => h.id !== host.id))))}
                                </div>
                                <button type="button" onClick={() => setIsHostSearchOpen(true)} className="mt-2 text-sm font-medium text-primary hover:text-primary-700">
                                    + Add Host
                                </button>
                            </fieldset>

                             <fieldset className="border-t border-gray-200 pt-4">
                                <legend className="text-lg font-medium text-gray-900">Participants</legend>
                                <div className="mt-2 space-y-2">
                                    {selectedParticipants.map(p => renderSelectedUser(p, () => setSelectedParticipants(prev => prev.filter(user => user.id !== p.id))))}
                                </div>
                                <button type="button" onClick={() => setIsParticipantSearchOpen(true)} className="mt-2 text-sm font-medium text-primary hover:text-primary-700">
                                    + Add Participant
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
            </div>
        </>
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
            const getSortDate = (ws: Workshop) => {
                const firstSessionDate = ws.sessions?.[0]?.date;
                const dateToSortBy = firstSessionDate || ws.created_at;
                const time = new Date(dateToSortBy).getTime();
                return isNaN(time) ? 0 : time;
            };
            const timeA = getSortDate(a);
            const timeB = getSortDate(b);
            return timeB - timeA;
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
            console.error('Failed to delete workshop:', error);
            alert('Failed to delete workshop. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {isModalOpen && <CreateWorkshopModal onClose={() => setIsModalOpen(false)} />}
            {workshopToDelete && (
                <DeleteWorkshopModal
                    workshop={workshopToDelete}
                    onClose={() => setWorkshopToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    isDeleting={isDeleting}
                />
            )}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="mt-1 text-lg text-gray-600">Welcome back, {user?.name || 'User'}.</p>
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

            {isLoading ? (
                <div className="text-center p-10">Loading workshops...</div>
            ) : (
                <>
                    {workshops.length === 0 ? (
                        <div className="text-center bg-white p-12 rounded-lg shadow-md border">
                             <h3 className="text-xl font-medium text-gray-900">No workshops yet</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by creating a new workshop.</p>
                             {isManager && (
                                <div className="mt-6">
                                    <button
                                         onClick={() => setIsModalOpen(true)}
                                         type="button"
                                         className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                     >
                                         <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                                         New Workshop
                                     </button>
                                 </div>
                             )}
                        </div>
                    ) : (
                         <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">Current & Upcoming</h2>
                                {currentAndUpcoming.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {currentAndUpcoming.map(ws => (
                                            <WorkshopCard 
                                                key={ws.id} 
                                                workshop={ws} 
                                                onDelete={() => setWorkshopToDelete(ws)} 
                                                canDelete={isManager}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                     <p className="text-gray-500">No active workshops.</p>
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">Previous</h2>
                                 {previous.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {previous.map(ws => (
                                             <WorkshopCard 
                                                key={ws.id} 
                                                workshop={ws} 
                                                onDelete={() => setWorkshopToDelete(ws)}
                                                canDelete={isManager}
                                             />
                                        ))}
                                    </div>
                                ) : (
                                     <p className="text-gray-500">No previously completed workshops.</p>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DashboardPage;