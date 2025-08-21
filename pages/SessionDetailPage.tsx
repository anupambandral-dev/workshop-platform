
import React, { useState, useContext, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { AppContextType } from '../types';
import { CalendarIcon, ClockIcon, UsersIcon } from '../components/Icons';

type Tab = 'details' | 'go-live' | 'attendance';

const SessionDetailPage: React.FC = () => {
    const { workshopId, sessionId } = useParams<{ workshopId: string, sessionId: string }>();
    const { workshops, updateSession, user } = useContext(AppContext) as AppContextType;
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('details');
    
    const { workshop, session } = useMemo(() => {
        if (!workshopId || !sessionId || workshops.length === 0) {
            return { workshop: null, session: null };
        }
        const ws = workshops.find(w => w.id === workshopId);
        if (!ws) return { workshop: null, session: null };
        const s = ws.sessions.find(s => s.id === sessionId);
        return { workshop: ws, session: s || null };
    }, [workshops, workshopId, sessionId]);

    // State for the controlled form
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        start_time: '',
        end_time: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (session) {
            setFormData({
                title: session.title,
                date: session.date,
                start_time: session.start_time,
                end_time: session.end_time,
            });
            // Set initial active tab based on session status
            setActiveTab(session.status === 'ended' ? 'attendance' : 'details');
        }
    }, [session]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;
        setIsSaving(true);
        try {
            await updateSession({ ...session, ...formData });
            alert('Session details saved successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to save session details.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGoLive = async () => {
        if (session && user) {
            await updateSession({ ...session, status: 'live' });
            // Critical fix: Set the session user for the manager/host
            sessionStorage.setItem('workshop_session_user', JSON.stringify(user));
            navigate(`/session/${session.id}/live`);
        }
    };
    
    if (!workshop || !session) {
        return <div className="p-10 text-center">Loading session details...</div>;
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
                <Link to={`/workshop/${workshopId}`} className="text-sm font-medium text-primary hover:text-primary-700">&larr; Back to Workshop</Link>
                <h1 className="text-3xl font-bold text-gray-900 mt-2">{session.title}</h1>
                <p className="text-lg text-gray-600">{workshop.title}</p>
                 <div className="flex items-center text-md text-gray-500 mt-2 space-x-4">
                    <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-1.5" />
                        <span>{new Date(session.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center">
                        <ClockIcon className="h-5 w-5 mr-1.5" />
                        <span>{session.start_time} - {session.end_time}</span>
                    </div>
                </div>
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('details')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Details
                    </button>
                    {session.status !== 'ended' && (
                         <button onClick={() => setActiveTab('go-live')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'go-live' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Go Live
                        </button>
                    )}
                    {session.status === 'ended' && (
                         <button onClick={() => setActiveTab('attendance')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'attendance' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Attendance
                        </button>
                    )}
                </nav>
            </div>
            
            <div className="mt-8">
                {activeTab === 'details' && (
                    <div className="bg-white p-6 rounded-lg shadow-md border">
                        <h3 className="text-xl font-bold mb-4">Edit Session Details</h3>
                        <form onSubmit={handleSaveChanges} className="space-y-4">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Session Title</label>
                                <input type="text" id="title" value={formData.title} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                                    <input type="date" id="date" value={formData.date} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">Start Time</label>
                                    <input type="time" id="start_time" value={formData.start_time} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">End Time</label>
                                    <input type="time" id="end_time" value={formData.end_time} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-700 disabled:bg-primary-300">
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                {activeTab === 'go-live' && (
                     <div className="bg-white p-8 rounded-lg shadow-md border text-center">
                        <h3 className="text-2xl font-bold mb-4">Ready to Start?</h3>
                        <p className="text-gray-600 mb-6">This will mark the session as 'live' and allow participants to join.</p>
                        <button onClick={handleGoLive} className="px-8 py-4 text-lg font-bold text-white bg-green-600 rounded-md hover:bg-green-700 transition-transform hover:scale-105">
                            Go Live Now
                        </button>
                    </div>
                )}
                {activeTab === 'attendance' && (
                    <div className="bg-white p-6 rounded-lg shadow-md border">
                        <h3 className="text-xl font-bold mb-4">Attendance Report</h3>
                         <ul className="divide-y">
                            {workshop.participants.map(p => {
                                const record = session.session_participant_records.find(r => r.participant_id === p.id);
                                const isPresent = record?.attendance === 'present';
                                return (
                                    <li key={p.id} className="p-3 flex items-center justify-between">
                                        <div>
                                           <p className="font-medium text-gray-800">{p.name}</p>
                                           <p className="text-sm text-gray-500">{p.email}</p>
                                        </div>
                                        {isPresent ? (
                                            <span className="px-2 py-0.5 text-xs font-medium text-green-800 bg-green-100 rounded-full">Present</span>
                                        ) : (
                                            <span className="px-2 py-0.5 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">Absent</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SessionDetailPage;
