import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL environment variable');
  throw new Error('Missing Supabase URL configuration. Please check your environment variables.');
}

if (!supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY environment variable');
  throw new Error('Missing Supabase key configuration. Please check your environment variables.');
}

// Create supabase client with proper types
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export interface LiteFoldJob {
  id: string
  job_id: string
  job_name: string
  job_desc: string
  model: string
  sequence: string
  status: 'pending' | 'processing' | 'successful' | 'crashed'
  created_at: string
  completed_at?: string
  user_id: string
} 