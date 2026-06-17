// ---------------------------------------------------------------------------
// Deployment-portable config. The only thing that changes between hosting
// targets (Vercel+Supabase now, AWS later) is where usage events are sent.
// Set VITE_INGEST_URL at build time to the absolute endpoint; if unset we fall
// back to the same-origin serverless path that ships with this repo.
// ---------------------------------------------------------------------------

const INGEST_PATH = '/api/webhook/usage';

/** Raw configured endpoint (may be relative). Used internally. */
export const INGEST_URL: string = (import.meta.env.VITE_INGEST_URL ?? '').trim() || INGEST_PATH;

/**
 * Absolute, copy-pasteable endpoint for display in setup instructions. If the
 * configured value is already absolute it is used as-is; a relative path is
 * resolved against the current origin so customers get a complete URL.
 */
export function ingestUrlAbsolute(): string {
  if (/^https?:\/\//i.test(INGEST_URL)) return INGEST_URL;
  if (typeof window !== 'undefined') return window.location.origin + INGEST_URL;
  return INGEST_URL;
}
