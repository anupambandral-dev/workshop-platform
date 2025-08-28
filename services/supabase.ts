import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types';

// Fix for lines 4 & 5: Cast `import.meta` to `any` to resolve TypeScript error where 'env' property
// is not found. This typically happens when Vite's client type definitions are not included
// in the TypeScript compilation scope.
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in environment variables.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);