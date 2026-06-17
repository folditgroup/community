import type { VercelRequest } from '@vercel/node';
import { getAdminClient } from './supabase';

// ---------------------------------------------------------------------------
// Verify a tenant's JWT from the Authorization header and resolve their
// tenant id. The tenant id is read from app_metadata only — app_metadata is
// not end-user-writable, so it is the trustworthy source for a tenant claim.
// ---------------------------------------------------------------------------

export interface AuthContext {
  userId: string;
  tenantId: string;
}

/** Resolved auth user that may not yet have a tenant (used by bootstrap). */
export interface UserContext {
  userId: string;
  email: string | null;
  tenantId: string | null;
  token: string;
}

function bearer(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

/**
 * Verify the JWT and return the user, WITHOUT requiring a tenant claim. Used by
 * the bootstrap endpoint, which runs before app_metadata.tenant_id is set.
 */
export async function authenticateUser(req: VercelRequest): Promise<UserContext | null> {
  const token = bearer(req);
  if (!token) return null;

  const { data, error } = await getAdminClient().auth.getUser(token);
  if (error || !data.user) return null;

  const appMeta = data.user.app_metadata as Record<string, unknown> | undefined;
  const claim = appMeta?.['tenant_id'];
  const tenantId = typeof claim === 'string' && claim.length > 0 ? claim : null;

  return { userId: data.user.id, email: data.user.email ?? null, tenantId, token };
}

export async function authenticate(req: VercelRequest): Promise<AuthContext | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;

  const { data, error } = await getAdminClient().auth.getUser(token);
  if (error || !data.user) return null;

  const appMeta = data.user.app_metadata as Record<string, unknown> | undefined;
  const claim = appMeta?.['tenant_id'];
  const tenantId = typeof claim === 'string' && claim.length > 0 ? claim : null;
  if (!tenantId) return null;

  return { userId: data.user.id, tenantId };
}
