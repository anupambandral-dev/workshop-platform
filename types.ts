// This file is a placeholder for the generated Supabase types.
// You would typically generate this file using:
// npx supabase gen types typescript --project-id <your-project-id> > types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_name: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_name: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_name?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_workshop_id_fkey"
            columns: ["workshop_id"]
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          }
        ]
      }
      hosts: {
        Row: {
          email: string
          id: string
          name: string
          workshop_id: string
        }
        Insert: {
          email: string
          id?: string
          name: string
          workshop_id: string
        }
        Update: {
          email?: string
          id?: string
          name?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosts_workshop_id_fkey"
            columns: ["workshop_id"]
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          }
        ]
      }
      participants: {
        Row: {
          attendance: string
          email: string
          evaluation: Json | null
          feedback: Json | null
          id: string
          name: string
          workshop_id: string
        }
        Insert: {
          attendance?: string
          email: string
          evaluation?: Json | null
          feedback?: Json | null
          id?: string
          name: string
          workshop_id: string
        }
        Update: {
          attendance?: string
          email?: string
          evaluation?: Json | null
          feedback?: Json | null
          id?: string
          name?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_workshop_id_fkey"
            columns: ["workshop_id"]
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          }
        ]
      }
      workshops: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          manager_id: string | null
          start_time: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          manager_id?: string | null
          start_time: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          manager_id?: string | null
          start_time?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshops_manager_id_fkey"
            columns: ["manager_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Custom client-side types combining Supabase types for convenience
export type Host = Database['public']['Tables']['hosts']['Row'];
export type Participant = Database['public']['Tables']['participants']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type Workshop = Database['public']['Tables']['workshops']['Row'] & {
  hosts: Host[];
  participants: Participant[];
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

// Simplified user type for client-side state
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'host' | 'participant';
}

// AppContext type
export interface AppContextType {
  session: import('@supabase/supabase-js').Session | null;
  user: SessionUser | null;
  workshops: Workshop[];
  isLoading: boolean;
  addWorkshop: (workshopData: Omit<Database['public']['Tables']['workshops']['Insert'], 'id' | 'created_at' | 'manager_id' | 'status'>, hosts: Omit<Database['public']['Tables']['hosts']['Insert'], 'id' | 'workshop_id'>[], participants: Omit<Database['public']['Tables']['participants']['Insert'], 'id' | 'workshop_id' | 'attendance' | 'feedback' | 'evaluation'>[]) => Promise<void>;
  updateWorkshop: (workshop: Workshop) => Promise<void>;
  updateParticipant: (participant: Participant) => Promise<void>;
}
