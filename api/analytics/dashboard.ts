import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../_lib/auth';
import { getAdminClient } from '../_lib/supabase';

// GET /api/analytics/dashboard — aggregate this tenant's usage into the
// TenantDataset the frontend renders. Totals, busiest hours, and top questions
// are real; the intra-period daily curve is synthesized client-side from totals.

const DAY = 86_400_000;

interface EventRow {
  chatbot_id: string;
  conversation_id: string | null;
  message_count: number | null;
  token_cost_usd: number | string | null;
  platform_cost_usd: number | string | null;
  hour_of_day: number | null;
  created_at: string;
}
interface BotRow {
  id: string;
  name: string;
  provider: string;
  openai_model: string;
  capture_messages: boolean;
  monthly_budget_usd: number | string | null;
  is_active: boolean;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v) || 0);

/** Tiny stable hash (FNV-1a) for the client-side series seed. */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 9973;
}
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'workspace';
}
function pct(cur: number, prev: number): number {
  if (prev <= 0) return 0;
  return Math.round(((cur - prev) / prev) * 100);
}
function relTime(ms: number | null): string {
  if (ms == null) return 'No activity yet';
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.floor(h / 24);
  return d + (d === 1 ? ' day ago' : ' days ago');
}

interface Bucket {
  users: Set<string>;
  int: number;
  token: number;
  plat: number;
}
const emptyBucket = (): Bucket => ({ users: new Set(), int: 0, token: 0, plat: 0 });
const finalize = (b: Bucket) => ({ users: b.users.size, int: b.int, token: b.token, plat: b.plat });

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = await authenticate(req);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabase = getAdminClient();
  const now = Date.now();

  try {
    const [{ data: tenant }, { data: botRows }, { data: events }, { data: questions }, ownerRes] =
      await Promise.all([
        supabase
          .from('tenants')
          .select('id, name, monthly_budget_usd, alert_threshold_pct')
          .eq('id', auth.tenantId)
          .single(),
        supabase
          .from('chatbots')
          .select('id, name, provider, openai_model, capture_messages, monthly_budget_usd, is_active')
          .eq('tenant_id', auth.tenantId)
          .order('created_at', { ascending: true }),
        supabase
          .from('usage_events')
          .select('chatbot_id, conversation_id, message_count, token_cost_usd, platform_cost_usd, hour_of_day, created_at')
          .eq('tenant_id', auth.tenantId)
          .gte('created_at', new Date(now - 90 * DAY).toISOString()),
        supabase
          .from('top_questions')
          .select('chatbot_id, question, ask_count')
          .eq('tenant_id', auth.tenantId)
          .order('ask_count', { ascending: false }),
        supabase.auth.admin.getUserById(auth.userId),
      ]);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const bots = (botRows ?? []) as BotRow[];
    const evs = (events ?? []) as EventRow[];
    const qs = (questions ?? []) as { chatbot_id: string; question: string; ask_count: number }[];

    const WINDOWS: Array<['7d' | '30d' | '90d', number]> = [
      ['7d', 7],
      ['30d', 30],
      ['90d', 90],
    ];

    // Per-bot buckets for each window + previous-30d (for trend).
    const perBot = new Map<
      string,
      { w: Record<string, Bucket>; prev30: Bucket; lastMs: number | null }
    >();
    for (const b of bots) {
      perBot.set(b.id, {
        w: { '7d': emptyBucket(), '30d': emptyBucket(), '90d': emptyBucket() },
        prev30: emptyBucket(),
        lastMs: null,
      });
    }
    const hourly = new Array<number>(24).fill(0);

    for (const e of evs) {
      const slot = perBot.get(e.chatbot_id);
      if (!slot) continue;
      const t = Date.parse(e.created_at);
      const ageDays = (now - t) / DAY;
      const conv = e.conversation_id ?? '';
      const mc = num(e.message_count) || 1;
      const tok = num(e.token_cost_usd);
      const plat = num(e.platform_cost_usd);

      for (const [key, days] of WINDOWS) {
        if (ageDays <= days) {
          const bk = slot.w[key];
          if (conv) bk.users.add(conv);
          bk.int += mc;
          bk.token += tok;
          bk.plat += plat;
        }
      }
      if (ageDays > 30 && ageDays <= 60) {
        if (conv) slot.prev30.users.add(conv);
        slot.prev30.int += mc;
        slot.prev30.token += tok;
        slot.prev30.plat += plat;
      }
      if (slot.lastMs == null || t > slot.lastMs) slot.lastMs = t;

      const hr = e.hour_of_day;
      if (ageDays <= 30 && typeof hr === 'number' && hr >= 0 && hr < 24) hourly[hr] += mc;
    }

    const datasetBots = bots.map((b) => {
      const slot = perBot.get(b.id)!;
      const m30 = finalize(slot.w['30d']);
      const p30 = finalize(slot.prev30);
      const curCost = m30.token + m30.plat;
      const prevCost = p30.token + p30.plat;
      const curAvg = m30.users ? curCost / m30.users : 0;
      const prevAvg = p30.users ? prevCost / p30.users : 0;
      const topQuestions = qs
        .filter((q) => q.chatbot_id === b.id)
        .slice(0, 6)
        .map((q) => [q.question, q.ask_count] as [string, number]);
      return {
        id: b.id,
        key: b.id,
        name: b.name,
        provider: b.provider,
        model: b.openai_model,
        modelLabel: `${b.provider} · ${b.openai_model}`,
        keyMasked: '',
        last: relTime(slot.lastMs),
        status: b.is_active ? 'connected' : 'error',
        seed: hashSeed(b.id),
        metrics: {
          '7d': finalize(slot.w['7d']),
          '30d': m30,
          '90d': finalize(slot.w['90d']),
        },
        trend: {
          cost: pct(curCost, prevCost),
          token: pct(m30.token, p30.token),
          plat: pct(m30.plat, p30.plat),
          avgcost: pct(curAvg, prevAvg),
        },
        topQuestions,
        captureMessages: b.capture_messages,
        budget: b.monthly_budget_usd == null ? undefined : num(b.monthly_budget_usd),
      };
    });

    // Tenant-level trend (sum of bots, 30d vs prev-30d).
    const sum = (sel: (s: { w: Record<string, Bucket>; prev30: Bucket }) => Bucket) => {
      const acc = { token: 0, plat: 0, users: 0 };
      for (const slot of perBot.values()) {
        const f = finalize(sel(slot));
        acc.token += f.token;
        acc.plat += f.plat;
        acc.users += f.users;
      }
      return acc;
    };
    const cur = sum((s) => s.w['30d']);
    const prev = sum((s) => s.prev30);
    const curC = cur.token + cur.plat;
    const prevC = prev.token + prev.plat;
    const allTrend = {
      cost: pct(curC, prevC),
      token: pct(cur.token, prev.token),
      plat: pct(cur.plat, prev.plat),
      avgcost: pct(cur.users ? curC / cur.users : 0, prev.users ? prevC / prev.users : 0),
    };

    const hMax = Math.max(...hourly, 0);
    const hourlyNorm = hourly.map((c) => (hMax > 0 ? c / hMax : 0));

    const ownerEmail = ownerRes?.data?.user?.email ?? null;
    const team = ownerEmail
      ? [
          {
            ini: ownerEmail.slice(0, 2).toUpperCase(),
            name: ownerEmail.split('@')[0],
            email: ownerEmail,
            role: 'Owner',
          },
        ]
      : [];

    const budget = num((tenant as { monthly_budget_usd: number }).monthly_budget_usd);
    const slug = slugify((tenant as { name: string }).name);

    const dataset = {
      workspace: {
        name: (tenant as { name: string }).name,
        timezone: 'America/New_York (ET)',
        currency: 'USD ($)',
      },
      billing: { plan: 'Starter', planPrice: '$0/mo', nextInvoice: '—', paymentMethod: 'Not set' },
      budgetTotal: budget,
      alertThreshold: (tenant as { alert_threshold_pct: number }).alert_threshold_pct ?? 80,
      team,
      defaultModel: 'GPT-4o',
      fallbackModel: 'GPT-4o mini',
      bots: datasetBots,
      allSeed: hashSeed(auth.tenantId),
      allTrend,
      allTopQuestions: qs.slice(0, 6).map((q) => [q.question, q.ask_count] as [string, number]),
      allMetrics: undefined,
      hourly: hourlyNorm,
      reports: [],
      reportEmail: `billing@${slug}.com`,
      live: true,
    };

    res.status(200).json({ dataset });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
