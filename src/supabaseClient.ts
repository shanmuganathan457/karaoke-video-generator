import { createClient } from '@supabase/supabase-js';

// ── Supabase Configuration ──────────────────────────────────────────────────
// Set these in your .env file:
//   VITE_SUPABASE_URL=https://your-project-id.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key-here
// ───────────────────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize client safely so it doesn't crash (white screen) if env vars are missing on Vercel
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({} as any);
// ── Database Types ──────────────────────────────────────────────────────────
export interface DbProject {
  id: string;
  user_id: string;
  title: string;
  date: string;
  duration: string;
  mode: 'auto' | 'custom';
  processing_time: number;
  status: 'done';
  video_url?: string;
  job_id?: string;
  is_favorite: boolean;
  created_at: string;
}
