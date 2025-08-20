import type { Workshop, Host, Participant, Session } from '../types';

const getNextDayOfWeek = (dayOfWeek: number): Date => { // 0=Sun, 1=Mon, ..., 6=Sat
    const date = new Date();
    date.setDate(date.getDate() + (dayOfWeek + 7 - date.getDay()) % 7);
    if (date.getDay() === new Date().getDay() && date < new Date()) {
         date.setDate(date.getDate() + 7);
    }
    return date;
};

const defaultWorkshops: Workshop[] = (() => {
    const workshopId = 'ws_1';
    const participants: Participant[] = [
        { id: 'p_1', name: 'Bob', email: 'bob@example.com' },
        { id: 'p_2', name: 'Charlie', email: 'charlie@example.com' },
    ];

    const session1Date = getNextDayOfWeek(1); // Next Monday
    session1Date.setDate(session1Date.getDate() - 7); // Previous Monday
    const session2Date = getNextDayOfWeek(1); // Next Monday
    
    const sessions: Session[] = [
        {
            id: 's_1', workshop_id: workshopId, session_number: 1, title: 'Session 1: Introduction',
            date: session1Date.toISOString().split('T')[0], start_time: '09:00', end_time: '11:00',
            status: 'ended',
            participant_records: participants.map(p => ({
                participant_id: p.id, attendance: 'present',
                feedback: { interactive: 4, helpful: 5, overall: 4 },
                evaluation: { active: 4, valueAdded: 4, overall: 4 }
            }))
        },
        {
            id: 's_2', workshop_id: workshopId, session_number: 2, title: 'Session 2: Advanced Topics',
            date: session2Date.toISOString().split('T')[0], start_time: '09:00', end_time: '11:00',
            status: 'scheduled',
            participant_records: participants.map(p => ({
                participant_id: p.id, attendance: 'pending', feedback: null, evaluation: null
            }))
        }
    ];

    return [
        {
            id: workshopId,
            title: 'Patent Understanding Training',
            hosts: [ { id: 'h_1', name: 'Alice', email: 'alice@example.com' } ],
            participants,
            sessions,
        }
    ];
})();


const DB_KEY = 'workshops_db';

const loadDb = (): Workshop[] => {
    try {
        const data = localStorage.getItem(DB_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Failed to load from localStorage", e);
    }
    localStorage.setItem(DB_KEY, JSON.stringify(defaultWorkshops));
    return defaultWorkshops;
}

const saveDb = (data: Workshop[]) => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Failed to save to localStorage", e);
    }
}

// Initialize DB on load
let workshops = loadDb();

export const mockApi = {
    login: async (email: string, pass: string): Promise<{ id: string, name: string, email: string, role: 'manager' }> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (email.toLowerCase().includes('manager') && pass.length > 0) {
                    const user = { id: 'manager-123', name: 'Training Manager', email, role: 'manager' as const };
                    sessionStorage.setItem('workshop_session_user', JSON.stringify(user));
                    resolve(user);
                } else {
                    reject(new Error("Invalid credentials. For this demo, email must contain 'manager'."));
                }
            }, 500);
        });
    },

    logout: async () => {
        sessionStorage.removeItem('workshop_session_user');
        return Promise.resolve();
    },

    getWorkshops: async (): Promise<Workshop[]> => {
        workshops = loadDb();
        return Promise.resolve(workshops);
    },

    addWorkshop: async (
        workshopData: { title: string; total_sessions: number; weekday: string; time: string },
        newHosts: Omit<Host, 'id'>[],
        newParticipants: Omit<Participant, 'id'>[]
    ): Promise<void> => {
        const db = loadDb();
        const newWorkshopId = `ws_${Date.now()}`;
        
        const participants = newParticipants.map((p, i) => ({ ...p, id: `p_${Date.now()}_${i}` }));
        
        const sessions: Session[] = [];
        const dayOfWeek = parseInt(workshopData.weekday, 10);
        let currentSessionDate = getNextDayOfWeek(dayOfWeek);
        
        for (let i = 1; i <= workshopData.total_sessions; i++) {
            sessions.push({
                id: `s_${newWorkshopId}_${i}`,
                workshop_id: newWorkshopId,
                session_number: i,
                title: `Session ${i}`,
                date: currentSessionDate.toISOString().split('T')[0],
                start_time: workshopData.time,
                end_time: '17:00', // Placeholder end time
                status: 'scheduled',
                participant_records: participants.map(p => ({
                    participant_id: p.id,
                    attendance: 'pending',
                    feedback: null,
                    evaluation: null
                }))
            });
            // Set date for next session
            currentSessionDate.setDate(currentSessionDate.getDate() + 7);
        }

        const workshop: Workshop = {
            id: newWorkshopId,
            title: workshopData.title,
            hosts: newHosts.map((h, i) => ({ ...h, id: `h_${Date.now()}_${i}` })),
            participants,
            sessions,
        };
        db.unshift(workshop);
        saveDb(db);
        return Promise.resolve();
    },

    updateWorkshop: async (updatedWorkshop: Workshop): Promise<void> => {
        let db = loadDb();
        db = db.map(ws => ws.id === updatedWorkshop.id ? updatedWorkshop : ws);
        saveDb(db);
        return Promise.resolve();
    },

    updateSession: async (updatedSession: Session): Promise<void> => {
        let db = loadDb();
        db = db.map(ws => {
            if (ws.id === updatedSession.workshop_id) {
                return {
                    ...ws,
                    sessions: ws.sessions.map(s => s.id === updatedSession.id ? updatedSession : s)
                };
            }
            return ws;
        });
        saveDb(db);
        return Promise.resolve();
    }
};