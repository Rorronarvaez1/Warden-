import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@warden/db';
import { config } from './config';

export type Db = SupabaseClient<Database>;

// Service role: omite RLS. Nunca usar esta llave fuera del worker.
export const db: Db = createClient<Database>(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
