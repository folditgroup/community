/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Absolute URL of the usage-ingest endpoint. Empty -> same-origin /api. */
  readonly VITE_INGEST_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
