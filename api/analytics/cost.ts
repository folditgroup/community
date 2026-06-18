import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { authenticateUser } from '../_lib/auth';
import { getAdminClient } from '../_lib/supabase';

// GET /api/analytics/cost — total + per-model cost for a client over a period.
// Params: client_id (tenant UUID), from/to (ISO), or period (7d|30d|90d|all).
// Auth, either:
//   1. Bearer <ANALYTICS_API_TOKEN> — privileged, any client_id
//   2. Bearer <user JWT> — own client only, unless app_metadata.role = 'admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function resolveRange(
  from: string | undefined,
  to: string | undefined,
  period: string | undefined,
): { fromISO: string; toISO: string } {
  const now = Date.now();
  const toMs = to ? Date.parse(to) : now;
  if (from) {
    const fromMs = Date.parse(from);
    return { fromISO: new Date(fromMs).toISOString(), toISO: new Date(toMs).toISOString() };
  }
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : null;
  const fromMs = days == null ? 0 : now - days * 86_400_000; // 'all' -> epoch
  return { fromISO: new Date(fromMs).toISOString(), toISO: new Date(toMs).toISOString() };
}

interface ModelRow {
  model: string;
  event_count: number | string;
  total_tokens: number | string;
  token_cost_usd: number | string;
  platform_cost_usd: number | string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const header = req.headers.authorization ?? '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const clientIdParam = firstParam(req.query.client_id as string | string[] | undefined);
  const serviceToken = process.env.ANALYTICS_API_TOKEN;

  let tenantId: string | null = null;

  if (serviceToken && bearerToken && constantTimeEqual(bearerToken, serviceToken)) {
    // Privileged service caller — must name the client.
    if (!clientIdParam) {
      res.status(400).json({ error: 'client_id is required' });
      return;
    }
    tenantId = clientIdParam;
  } else {
    const user = await authenticateUser(req);
    if (!user || !user.tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const isAdmin = user.role === 'admin';
    if (clientIdParam && clientIdParam !== user.tenantId && !isAdmin) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    tenantId = clientIdParam && isAdmin ? clientIdParam : user.tenantId;
  }

  if (!tenantId || !UUID_RE.test(tenantId)) {
    res.status(400).json({ error: 'Invalid client_id' });
    return;
  }

  const { fromISO, toISO } = resolveRange(
    firstParam(req.query.from as string | string[] | undefined),
    firstParam(req.query.to as string | string[] | undefined),
    firstParam(req.query.period as string | string[] | undefined),
  );

  try {
    const { data, error } = await getAdminClient().rpc('analytics_cost_summary', {
      p_tenant_id: tenantId,
      p_from: fromISO,
      p_to: toISO,
    });
    if (error) {
      res.status(500).json({ error: 'Server error' });
      return;
    }

    const rows = (data ?? []) as ModelRow[];
    const n = (v: unknown) => Number(v) || 0;
    const byModel = rows.map((r) => ({
      model: r.model,
      events: n(r.event_count),
      total_tokens: n(r.total_tokens),
      token_cost_usd: Math.round(n(r.token_cost_usd) * 1e6) / 1e6,
      platform_cost_usd: Math.round(n(r.platform_cost_usd) * 1e6) / 1e6,
      total_cost_usd: Math.round((n(r.token_cost_usd) + n(r.platform_cost_usd)) * 1e6) / 1e6,
    }));

    const sum = (k: 'token_cost_usd' | 'platform_cost_usd' | 'total_tokens' | 'events') =>
      byModel.reduce((acc, m) => acc + m[k], 0);
    const tokenCost = Math.round(sum('token_cost_usd') * 1e6) / 1e6;
    const platformCost = Math.round(sum('platform_cost_usd') * 1e6) / 1e6;

    res.status(200).json({
      client_id: tenantId,
      from: fromISO,
      to: toISO,
      event_count: sum('events'),
      total_tokens: sum('total_tokens'),
      token_cost_usd: tokenCost,
      platform_cost_usd: platformCost,
      total_cost_usd: Math.round((tokenCost + platformCost) * 1e6) / 1e6,
      by_model: byModel,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
