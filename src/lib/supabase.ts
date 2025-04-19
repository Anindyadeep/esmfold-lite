import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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