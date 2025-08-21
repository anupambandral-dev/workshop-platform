// Types for the application, designed for the flexible role model

// --- Database table shapes (based on your Supabase schema) ---

export type Employee = {
  id: string; // This can be any unique ID from your system, e.g., auth.users.id
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
  feedback?: {
    interactive: number;
    helpful: number;
    overall: number;
  } | null;
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

export type ChatMessage = {
  id: number;
  session_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
};


// --- Composite types for client-side state (combining table data) ---

export type SessionWithRecords = Session & {
  session_participant_records: SessionParticipantRecord[];
};

export type Workshop = RawWorkshop & {
  hosts: Host[];
  participants: Participant[];
  sessions: SessionWithRecords[];
};


// --- User and Context types ---

// Represents the currently logged-in manager
export interface ManagerUser {
  id: string;
  name: string;
  email: string;
  role: 'manager';
}

// Represents the user's role for a specific session (stored in sessionStorage)
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'host' | 'participant';
}

export interface AppContextType {
  user: ManagerUser | null; // Only managers can be logged-in users now
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
      employees: {
        Row: Employee;
        Insert: { id: string; name: string; email: string; };
        Update: { id?: string; name?: string; email?: string; };
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: { session_id: string; sender_id: string; sender_name: string; message: string; };
        Update: { session_id?: string; sender_id?: string; sender_name?: string; message?: string; };
      };
      hosts: {
        Row: Host;
        Insert: { workshop_id: string; name: string; email: string; };
        Update: { workshop_id?: string; name?: string; email?: string; };
      };
      participants: {
        Row: Participant;
        Insert: { workshop_id: string; name: string; email: string; };
        Update: { workshop_id?: string; name?: string; email?: string; };
      };
      session_participant_records: {
        Row: SessionParticipantRecord;
        Insert: { session_id: string; participant_id: string; attendance: 'pending' | 'present'; };
        Update: { session_id?: string; participant_id?: string; attendance?: 'pending' | 'present'; feedback?: any | null; };
      };
      sessions: {
        Row: Session;
        Insert: { workshop_id: string; session_number: number; title: string; date: string; start_time: string; end_time: string; status: "scheduled" | "live" | "ended"; };
        Update: { workshop_id?: string; session_number?: number; title?: string; date?: string; start_time?: string; end_time?: string; status?: "scheduled" | "live" | "ended"; host_reflection?: any | null; };
      };
      workshops: {
        Row: RawWorkshop;
        Insert: { title: string; manager_id: string; };
        Update: { title?: string; manager_id?: string; };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_manager: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
