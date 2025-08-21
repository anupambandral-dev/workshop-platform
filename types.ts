// Types for the application, designed to work with Supabase

// --- Database table shapes (based on your Supabase schema) ---

export type Employee = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

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

export type Feedback = {
  interactive: number;
  helpful: number;
  overall: number;
};

// New type for the host's reflection on the session
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
  feedback?: Feedback | null;      // Stored as JSONB in Supabase
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
  host_reflection?: HostReflection | null; // Stored as JSONB in Supabase
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
    hosts: Omit<Host, 'id' | 'workshop_id'>[], 
    participants: Omit<Participant, 'id' | 'workshop_id'>[]
  ) => Promise<void>;
  updateSession: (session: SessionWithRecords) => Promise<void>;
}

// --- Supabase generated types replacement ---
export type Database = {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          name: string;
          email: string;
          created_at: string;
        };
        Insert: {
          name: string;
          email: string;
        };
        Update: {
          name?: string;
          email?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: number;
          session_id: string;
          sender_id: string;
          sender_name: string;
          message: string;
          created_at: string;
        };
        Insert: {
          session_id: string;
          sender_id: string;
          sender_name: string;
          message: string;
        };
        Update: {
          session_id?: string;
          sender_id?: string;
          sender_name?: string;
          message?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      hosts: {
        Row: {
          id: string;
          workshop_id: string;
          name: string;
          email: string;
        };
        Insert: {
          workshop_id: string;
          name: string;
          email: string;
        };
        Update: {
          workshop_id?: string;
          name?: string;
          email?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hosts_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          }
        ];
      };
      participants: {
        Row: {
          id: string;
          workshop_id: string;
          name: string;
          email: string;
        };
        Insert: {
          workshop_id: string;
          name: string;
          email: string;
        };
        Update: {
          workshop_id?: string;
          name?: string;
          email?: string;
        };
        Relationships: [
          {
            foreignKeyName: "participants_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          }
        ];
      };
      session_participant_records: {
        Row: {
          id: string;
          session_id: string;
          participant_id: string;
          attendance: 'pending' | 'present';
          feedback?: Feedback | null;
        };
        Insert: {
          session_id: string;
          participant_id: string;
          attendance?: 'pending' | 'present';
          feedback?: Feedback | null;
        };
        Update: {
          attendance?: 'pending' | 'present';
          feedback?: Feedback | null;
        };
        Relationships: [
          {
            foreignKeyName: "session_participant_records_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_participant_records_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      sessions: {
        Row: {
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
        Insert: {
          workshop_id: string;
          session_number: number;
          title: string;
          date: string;
          start_time: string;
          end_time: string;
          status?: 'scheduled' | 'live' | 'ended';
          host_reflection?: HostReflection | null;
        };
        Update: {
          workshop_id?: string;
          session_number?: number;
          title?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          status?: 'scheduled' | 'live' | 'ended';
          host_reflection?: HostReflection | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          }
        ];
      };
      workshops: {
        Row: {
          id: string;
          title: string;
          manager_id: string;
          created_at: string;
        };
        Insert: {
          title: string;
          manager_id: string;
        };
        Update: {
          title?: string;
          manager_id?: string;
        };
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
