import type { VercelRequest } from '@vercel/node';
import { getAdminClient } from './supabase';

// tenant_id is read from app_metadata only — it is not end-user-writable, so it
// is the trustworthy source for the tenant claim.

export interface AuthContext {
  userId: string;
  tenantId: string;
}

export interface UserContext {
  userId: string;
  email: string | null;
  tenantId: string | null;
  role: string | null;
  token: string;
}

function bearer(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

// Verify the JWT and resolve the user. Does NOT require a tenant claim, so it
// also serves bootstrap (which runs before tenant_id is set).
export async function authenticateUser(req: VercelRequest): Promise<UserContext | null> {
  const token = bearer(req);
  if (!token) return null;

  const { data, error } = await getAdminClient().auth.getUser(token);
  if (error || !data.user) return null;

  const appMeta = data.user.app_metadata as Record<string, unknown> | undefined;
  const claim = appMeta?.['tenant_id'];
  const tenantId = typeof claim === 'string' && claim.length > 0 ? claim : null;
  const roleClaim = appMeta?.['role'];
  const role = typeof roleClaim === 'string' && roleClaim.length > 0 ? roleClaim : null;

  return { userId: data.user.id, email: data.user.email ?? null, tenantId, role, token };
}

// Tenant-scoped auth: requires a tenant claim.
export async function authenticate(req: VercelRequest): Promise<AuthContext | null> {
  const user = await authenticateUser(req);
  if (!user || !user.tenantId) return null;
  return { userId: user.userId, tenantId: user.tenantId };
}
