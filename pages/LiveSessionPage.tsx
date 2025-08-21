// Types for the application, designed to work with Supabase

// --- Database table shapes (based on your Supabase schema) ---

export type Employee = {
  id: string; // This should be the auth.users.id for employees who can be hosts
  name: string;
  email: string;
  created_at: string;
};

// This type represents a host linked to a workshop. It's enriched with name/email on the client.
export type Host = {
  user_id: string;
  name?: string;  // Optional: added on the client from the employees list
  email?: string; // Optional: added on the client from the employees list
};

export type Participant = {
  id: string;
  workshop_id: string;
  name: string;
  email: string;
};

export type Feedback = {
  interactive: number;
  helpful: number;
  overall: number;
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
  feedback?: Feedback | null;
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

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'host' | 'participant';
}

export interface AppContextType {
  user: SessionUser | null;
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
        Insert: { name: string; email: string; };
        Update: { name?: string; email?: string; };
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: { session_id: string; sender_id: string; sender_name: string; message: string; };
        Update: { session_id?: string; sender_id?: string; sender_name?: string; message?: string; };
      };
      hosts: {
        Row: {
          id: string;
          workshop_id: string;
          user_id: string; // Correct schema
        };
        Insert: {
          workshop_id: string;
          user_id: string; // Correct schema
        };
        Update: {
          workshop_id?: string;
          user_id?: string; // Correct schema
        };
      };
      participants: {
        Row: Participant;
        Insert: { workshop_id: string; name: string; email: string; };
        Update: { workshop_id?: string; name?: string; email?: string; };
      };
      session_participant_records: {
        Row: SessionParticipantRecord;
        Insert: { session_id: string; participant_id: string; attendance: 'pending' | 'present'; };
        Update: { session_id?: string; participant_id?: string; attendance?: 'pending' | 'present'; feedback?: Feedback | null; };
      };
      sessions: {
        Row: Session;
        Insert: { workshop_id: string; session_number: number; title: string; date: string; start_time: string; end_time: string; status: "scheduled" | "live" | "ended"; };
        Update: { workshop_id?: string; session_number?: number; title?: string; date?: string; start_time?: string; end_time?: string; status?: "scheduled" | "live" | "ended"; host_reflection?: HostReflection | null; };
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
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
