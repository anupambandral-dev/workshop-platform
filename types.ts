// --- Base Database table shapes ---

export type Employee = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

// Host is now structurally the same as a Participant for a given workshop
export type Host = {
  id: string;
  workshop_id: string;
  name: string;
  email: string;
};

export type Participant = {
  id: string;
  workshop_id: string;
  name: string;
  email: string;
};

export type HostReflection = {
  proactiveParticipantId: string;
  proactiveParticipantName: string;
  lessEngagedParticipantId: string;
  lessEngagedParticipantName: string;
  ahaMoment: string;
  biggestChallenge: string;
  overallSuccess: number;
};

export type SessionParticipantRecord = {
  id: string;
  session_id: string;
  participant_id: string;
  attendance: 'pending' | 'present';
  feedback?: { interactive: number; helpful: number; overall: number; } | null;
};

export type Session = {
  id: string;
  workshop_id: string;
  session_number: number;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'live' | 'ended';
  host_reflection?: HostReflection | null;
};

export type RawWorkshop = {
  id: string;
  title: string;
  manager_id: string;
  created_at: string;
};

// --- Composite types for client-side state ---

export type SessionWithRecords = Session & {
  session_participant_records: SessionParticipantRecord[];
};

export type Workshop = RawWorkshop & {
  hosts: Host[];
  participants: Participant[];
  sessions: SessionWithRecords[];
};


// --- User and Context types ---

// Represents the permanently logged-in manager
export interface ManagerUser {
  id: string;
  name: string;
  email: string;
  role: 'manager';
}

// Represents the user's role for a specific session (stored in sessionStorage)
export interface SessionUser {
  id: string; // Can be participant ID or host email
  name: string;
  email: string;
  role: 'manager' | 'host' | 'participant';
}

// Represents the temporary host access grant
export interface HostSession {
    workshopId: string;
    hostEmail: string;
    hostName: string;
}

export interface AppContextType {
  user: ManagerUser | null; // Only managers can be permanently logged-in
  workshops: Workshop[];
  employees: Employee[];
  isLoading: boolean;
  logout: () => Promise<void>;
  addWorkshop: (
    workshopData: { title: string; total_sessions: number; weekday: string; time: string },
    hosts: Employee[], 
    participants: Employee[]
  ) => Promise<void>;
  updateSession: (session: SessionWithRecords) => Promise<void>;
  deleteWorkshop: (workshopId: string) => Promise<void>;
  updateSessionInState: (updatedSession: SessionWithRecords) => void;
  updateParticipantRecordInState: (updatedRecord: SessionParticipantRecord) => void;
}

// --- Supabase generated types replacement ---
export type Database = {
  public: {
    Tables: {
      employees: { Row: Employee; Insert: any; Update: any; };
      chat_messages: { Row: any; Insert: any; Update: any; };
      hosts: {
        Row: Host;
        Insert: { workshop_id: string; name: string; email: string; };
        Update: { workshop_id?: string; name?: string; email?: string; };
      };
      participants: { Row: Participant; Insert: any; Update: any; };
      session_participant_records: { Row: SessionParticipantRecord; Insert: any; Update: any; };
      sessions: { Row: Session; Insert: any; Update: any; };
      workshops: { Row: RawWorkshop; Insert: any; Update: any; };
    };
    Views: { [_ in never]: never; };
    Functions: { is_manager: { Args: Record<PropertyKey, never>; Returns: boolean; }; };
    Enums: { [_ in never]: never; };
    CompositeTypes: { [_ in never]: never; };
  };
};
