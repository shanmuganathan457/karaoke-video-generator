import { createClient } from '@supabase/supabase-js';

// ── Supabase Configuration ──────────────────────────────────────────────────
// Set these in your .env file:
//   VITE_SUPABASE_URL=https://your-project-id.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key-here
// ───────────────────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
