// Types for the application, designed to work with Supabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// --- Database table shapes (based on your Supabase schema) ---

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

export type Evaluation = {
  active: number;
  valueAdded: number;
  overall: number;
};

export type SessionParticipantRecord = {
  id: string;
  session_id: string;
  participant_id: string;
  attendance: 'pending' | 'present';
  feedback: Json | null;      // Stored as JSONB in Supabase
  evaluation: Json | null;    // Stored as JSONB in Supabase
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
      chat_messages: {
        Row: ChatMessage;
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
      };
      hosts: {
        Row: Host;
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
      };
      participants: {
        Row: Participant;
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
      };
      session_participant_records: {
        Row: SessionParticipantRecord;
        Insert: {
          session_id: string;
          participant_id: string;
          attendance: 'pending' | 'present';
          feedback: Json | null;
          evaluation: Json | null;
        };
        Update: {
          session_id?: string;
          participant_id?: string;
          attendance?: 'pending' | 'present';
          feedback?: Json | null;
          evaluation?: Json | null;
        };
      };
      sessions: {
        Row: Session;
        Insert: {
          workshop_id: string;
          session_number: number;
          title: string;
          date: string;
          start_time: string;
          end_time: string;
          status: 'scheduled' | 'live' | 'ended';
        };
        Update: {
          workshop_id?: string;
          session_number?: number;
          title?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          status?: 'scheduled' | 'live' | 'ended';
        };
      };
      workshops: {
        Row: RawWorkshop;
        Insert: {
          title: string;
          manager_id: string;
        };
        Update: {
          title?: string;
          manager_id?: string;
        };
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
