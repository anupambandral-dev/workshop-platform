import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import type { AppContextType, Workshop, Host, Participant } from '../types';
import { PlusIcon, UsersIcon, CalendarIcon, ClockIcon, TrashIcon } from '../components/Icons';
import { useNavigate } from 'react-router-dom';

const WorkshopCard: React.FC<{ workshop: Workshop }> = ({ workshop }) => {
    const navigate = useNavigate();
    
    const nextSession = useMemo(() => 
        workshop.sessions.find(s => s.status !== 'ended'), 
    [workshop.sessions]);

    const status = nextSession ? (nextSession.status === 'live' ? 'live' : 'scheduled') : 'ended';
    
    const getStatusChip = (status: 'scheduled' | 'live' | 'ended') => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-800';
            case 'live': return 'bg-green-100 text-green-800 animate-pulse';
            case 'ended': return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div 
            onClick={() => navigate(`/workshop/${workshop.id}`)}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border border-gray-200 flex flex-col justify-between"
        >
            <div>
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{workshop.title}</h3>
                     <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusChip(status)}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </div>
                <div className="space-y-2 text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1.5" />
                        <span>{workshop.sessions.length} sessions</span>
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
        </div>
    );
};

const CreateWorkshopModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { addWorkshop } = useContext(AppContext) as AppContextType;
    const [title, setTitle] = useState('');
    const [totalSessions, setTotalSessions] = useState(1);
    const [weekday, setWeekday] = useState('1'); // Monday
    const [time, setTime] = useState('10:00');
    const [hosts, setHosts] = useState([{ name: '', email: '' }]);
    const [participants, setParticipants] = useState([{ name: '', email: '' }]);
    const [isCreating, setIsCreating] = useState(false);

    const handleAddHost = () => setHosts([...hosts, { name: '', email: '' }]);
    const handleRemoveHost = (index: number) => setHosts(hosts.filter((_, i) => i !== index));
    const handleHostChange = (index: number, field: 'name' | 'email', value: string) => {
        const newHosts = [...hosts];
        newHosts[index][field] = value;
        setHosts(newHosts);
    };

    const handleAddParticipant = () => setParticipants([...participants, { name: '', email: '' }]);
    const handleRemoveParticipant = (index: number) => setParticipants(participants.filter((_, i) => i !== index));
    const handleParticipantChange = (index: number, field: 'name' | 'email', value: string) => {
        const newParticipants = [...participants];
        newParticipants[index][field] = value;
        setParticipants(newParticipants);
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        const workshopData = { title, total_sessions: totalSessions, weekday, time };
        try {
            await addWorkshop(workshopData, hosts, participants);
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to create workshop.");
        } finally {
            setIsCreating(false);
        }
    };

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
                            <div className="mt-2 space-y-4">
                                {hosts.map((host, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <input type="text" placeholder="Host Name" value={host.name} onChange={e => handleHostChange(index, 'name', e.target.value)} required className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                        <input type="email" placeholder="Host Email" value={host.email} onChange={e => handleHostChange(index, 'email', e.target.value)} required className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                        <button type="button" onClick={() => handleRemoveHost(index)} disabled={hosts.length === 1} className="p-2 text-gray-500 hover:text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddHost} className="text-sm font-medium text-primary hover:text-primary-700 flex items-center">
                                    <PlusIcon className="h-4 w-4 mr-1" /> Add Host
                                </button>
                            </div>
                        </fieldset>

                         <fieldset className="border-t border-gray-200 pt-4">
                            <legend className="text-lg font-medium text-gray-900">Participants</legend>
                             <div className="mt-2 space-y-4">
                                {participants.map((p, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <input type="text" placeholder="Participant Name" value={p.name} onChange={e => handleParticipantChange(index, 'name', e.target.value)} required className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                        <input type="email" placeholder="Participant Email" value={p.email} onChange={e => handleParticipantChange(index, 'email', e.target.value)} required className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                        <button type="button" onClick={() => handleRemoveParticipant(index)} disabled={participants.length === 1} className="p-2 text-gray-500 hover:text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddParticipant} className="text-sm font-medium text-primary hover:text-primary-700 flex items-center">
                                    <PlusIcon className="h-4 w-4 mr-1" /> Add Participant
                                </button>
                            </div>
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
    );
};

const DashboardPage: React.FC = () => {
    const { workshops, isLoading, user } = useContext(AppContext) as AppContextType;
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    if (isLoading) {
        return <div className="text-center p-10">Loading workshops...</div>;
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Workshop Dashboard</h1>
                    <p className="mt-1 text-lg text-gray-600">Welcome back, {user?.name}!</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Workshop
                </button>
            </div>

            {isModalOpen && <CreateWorkshopModal onClose={() => setIsModalOpen(false)} />}
            
            <div className="space-y-12">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">Current & Upcoming</h2>
                    {currentAndUpcoming.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {currentAndUpcoming.map(ws => <WorkshopCard key={ws.id} workshop={ws} />)}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white rounded-lg shadow-md border">
                            <p className="text-gray-500">No current or upcoming workshops scheduled.</p>
                             <button onClick={() => setIsModalOpen(true)} className="mt-4 text-sm font-medium text-primary hover:text-primary-700">Create your first workshop</button>
                        </div>
                    )}
                </div>

                <div>
                    <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">Previous Workshops</h2>
                    {previous.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {previous.map(ws => <WorkshopCard key={ws.id} workshop={ws} />)}
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