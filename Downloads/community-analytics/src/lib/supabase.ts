import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Browser Supabase client — ANON (public) key only. The service-role key must
// never be imported anywhere under /src; it lives exclusively in /api.
//
// The dashboard currently renders from hardcoded mock data, so the client is
// created lazily and is null when env vars are absent (keeps local dev runnable
// without a Supabase project). Swap the mock calls for real queries by reading
// `supabase` and handling the null case.
// ---------------------------------------------------------------------------

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
