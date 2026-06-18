import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser Supabase client — publishable/anon key only. The service-role key
// must never be imported under /src; it lives exclusively in /api.
//
// Created lazily and null when env vars are absent, so the demo account still
// runs locally without a Supabase project configured.

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

/** Returns the client or throws a clear error if env is not configured. */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}
