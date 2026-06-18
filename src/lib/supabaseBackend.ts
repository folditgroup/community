import { getSupabase } from './supabase';
import type { Account, Tenant } from '../types';
import type { TenantDataset } from './dataset';
import type {
  AuthResult,
  ConnectChatbotInput,
  RegisterInput,
  UpdateChatbotInput,
  UpdateTenantInput,
} from './store';

// Supabase-backed implementation of the data layer (real accounts). Mirrors the
// local store's surface so SessionProvider can route to either. The demo
// (NY Yankees) stays on the local store; everything else flows through here.
// For Supabase accounts the credential is an EMAIL.

interface BootstrapTenant {
  id: string;
  name: string;
  monthly_budget_usd: number | string;
  alert_threshold_pct: number;
}
interface AuthUserLite {
  id: string;
  email?: string | null;
  created_at?: string;
  app_metadata?: { role?: string } | null;
}

async function accessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await accessToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

function tenantFromRow(row: BootstrapTenant): Tenant {
  return {
    id: row.id,
    workspace: { name: row.name, timezone: 'America/New_York (ET)', currency: 'USD ($)' },
    billing: { plan: 'Starter', planPrice: '$0/mo', nextInvoice: '—', paymentMethod: 'Not set' },
    budgetTotal: Number(row.monthly_budget_usd) || 0,
    alertThreshold: row.alert_threshold_pct ?? 80,
    team: [],
    chatbots: [],
    defaultModel: 'GPT-4o',
    fallbackModel: 'GPT-4o mini',
    seeded: false,
  };
}

function accountFromUser(user: AuthUserLite, tenantId: string): Account {
  return {
    id: user.id,
    login: user.email ?? user.id,
    salt: '',
    hash: '',
    tenantId,
    createdAt: user.created_at ?? new Date().toISOString(),
    role: user.app_metadata?.role,
  };
}

/** Idempotently ensure the signed-in user has a tenant; refresh JWT if created. */
async function ensureTenant(workspaceName?: string): Promise<Tenant> {
  const { tenant, created } = await authedFetch<{ tenant: BootstrapTenant; created: boolean }>(
    '/api/auth/bootstrap',
    { method: 'POST', body: JSON.stringify({ workspaceName: workspaceName ?? '' }) },
  );
  if (created) {
    // new JWT must carry the freshly-set tenant_id claim
    await getSupabase().auth.refreshSession();
  }
  return tenantFromRow(tenant);
}

export async function restore(): Promise<{ account: Account; tenant: Tenant } | null> {
  const { data } = await getSupabase().auth.getSession();
  if (!data.session) return null;
  const tenant = await ensureTenant();
  return { account: accountFromUser(data.session.user as AuthUserLite, tenant.id), tenant };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signUp({
    email: input.login.trim(),
    password: input.password,
  });
  if (error) return { ok: false, error: error.message };
  if (!data.session) {
    return {
      ok: false,
      error: 'Account created — check your email to confirm, then sign in.',
    };
  }
  const tenant = await ensureTenant(input.workspaceName);
  return { ok: true, account: accountFromUser(data.session.user as AuthUserLite, tenant.id) };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, error: error.message };
  const tenant = await ensureTenant();
  return { ok: true, account: accountFromUser(data.user as AuthUserLite, tenant.id) };
}

export async function logout(): Promise<void> {
  await getSupabase().auth.signOut();
}

export async function loadTenant(): Promise<Tenant | null> {
  try {
    return await ensureTenant();
  } catch {
    return null;
  }
}

export async function loadDataset(period: string): Promise<TenantDataset> {
  const { dataset } = await authedFetch<{ dataset: TenantDataset }>(
    `/api/analytics/dashboard?period=${encodeURIComponent(period)}`,
  );
  return dataset;
}

export async function connectChatbot(input: ConnectChatbotInput): Promise<void> {
  await authedFetch('/api/chatbots', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      provider: input.provider,
      model: input.model,
      capture_messages: input.captureMessages ?? false,
      monthly_budget_usd: input.budget && input.budget > 0 ? input.budget : null,
    }),
  });
}

export async function updateChatbot(id: string, patch: UpdateChatbotInput): Promise<void> {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.provider !== undefined) body.provider = patch.provider;
  if (patch.model !== undefined) body.model = patch.model;
  if (patch.captureMessages !== undefined) body.capture_messages = patch.captureMessages;
  if (patch.budget !== undefined) {
    body.monthly_budget_usd = patch.budget && patch.budget > 0 ? patch.budget : null;
  }
  await authedFetch(`/api/chatbots/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function disconnectChatbot(id: string): Promise<void> {
  await authedFetch(`/api/chatbots/${id}`, { method: 'DELETE' });
}

export async function updateTenant(patch: UpdateTenantInput): Promise<void> {
  const body: Record<string, unknown> = {};
  if (patch.workspaceName !== undefined) body.name = patch.workspaceName;
  if (patch.budgetTotal !== undefined) body.monthly_budget_usd = patch.budgetTotal;
  if (patch.alertThreshold !== undefined) body.alert_threshold_pct = patch.alertThreshold;
  if (Object.keys(body).length === 0) return;
  await authedFetch('/api/tenant', { method: 'PATCH', body: JSON.stringify(body) });
}

export interface CostByModel {
  model: string;
  events: number;
  total_tokens: number;
  token_cost_usd: number;
  platform_cost_usd: number;
  total_cost_usd: number;
}
export interface CostSummary {
  client_id: string;
  from: string;
  to: string;
  event_count: number;
  total_tokens: number;
  token_cost_usd: number;
  platform_cost_usd: number;
  total_cost_usd: number;
  by_model: CostByModel[];
}

/** Admin/cross-client cost lookup (GET /api/analytics/cost). */
export async function fetchCost(params: {
  clientId?: string;
  period?: string;
  from?: string;
  to?: string;
}): Promise<CostSummary> {
  const q = new URLSearchParams();
  if (params.clientId) q.set('client_id', params.clientId);
  if (params.period) q.set('period', params.period);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  return authedFetch<CostSummary>(`/api/analytics/cost?${q.toString()}`);
}
