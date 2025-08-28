// Types for the application, designed to work with Supabase

// --- Database table shapes (based on your Supabase schema) ---

export type Employee = {
  id: string; 
  name: string;
  email: string;
  created_at: string;
};

// This type represents a host linked to a workshop. It's enriched with name/email on the client.
export type Host = {
  employee_id: string;
  name?: string;  // Optional: added on the client from the employees list
  email?: string; // Optional: added on the client from the employees list
};

export type Participant = {
  id: string; // This is the ID from the 'participants' join table
  workshop_id: string;
  employee_id: string; // This is the FK to the employees table
  // Client-side enriched data from the related employee record
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
  addEmployees: (newEmployees: { name: string; email: string }[]) => Promise<{
    error: string | null;
  }>;
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
        Insert: { id?: string; name: string; email: string; };
        Update: Partial<Employee>;
        Relationships: [];
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: { session_id: string; sender_id: string; sender_name: string; message: string; };
        Update: Partial<ChatMessage>;
        Relationships: [];
      };
      hosts: {
        Row: {
          id: string;
          workshop_id: string;
          employee_id: string;
        };
        Insert: {
          workshop_id: string;
          employee_id: string;
        };
        Update: Partial<{
          id: string;
          workshop_id: string;
          employee_id: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "hosts_employee_id_fkey";
            columns: ["employee_id"];
            referencedRelation: "employees";
            referencedColumns: ["id"];
          }
        ];
      };
      participants: {
        Row: {
          id: string;
          workshop_id: string;
          employee_id: string;
        };
        Insert: { workshop_id: string; employee_id: string; };
        Update: Partial<{ id: string; workshop_id: string; employee_id: string; }>;
        Relationships: [];
      };
      session_participant_records: {
        Row: SessionParticipantRecord;
        Insert: { session_id: string; participant_id: string; attendance: 'pending' | 'present'; };
        Update: Partial<SessionParticipantRecord>;
        Relationships: [];
      };
      sessions: {
        Row: Session;
        Insert: { workshop_id: string; session_number: number; title: string; date: string; start_time: string; end_time: string; status: "scheduled" | "live" | "ended"; };
        Update: Partial<Session>;
        Relationships: [];
      };
      workshops: {
        Row: RawWorkshop;
        Insert: { title: string; manager_id: string; };
        Update: Partial<RawWorkshop>;
        Relationships: [];
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
