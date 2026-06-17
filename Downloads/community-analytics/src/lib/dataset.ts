import type {
  BotMetrics,
  PeriodMetrics,
  Provider,
  ReportRow,
  TeamMember,
  Tenant,
  Trend,
} from '../types';
import { hashSeed, mulberry32 } from './utils';

// ---------------------------------------------------------------------------
// A tenant's analytics are computed from the chatbots it has connected. This
// module turns a persisted Tenant into a TenantDataset: the seeded NY Yankees
// tenant reproduces the original design dataset verbatim, while tenant-created
// chatbots get deterministic, believable metrics seeded from their id.
// ---------------------------------------------------------------------------

export interface DatasetBot {
  key: string;
  id: string;
  name: string;
  provider: Provider;
  model: string;
  /** "OpenAI · GPT-4o" style label used on cards. */
  modelLabel: string;
  /** "2 min ago" style relative last-active label. */
  last: string;
  keyMasked: string;
  status: 'connected' | 'error';
  seed: number;
  metrics: BotMetrics;
  trend: Trend;
  topQuestions: ReadonlyArray<readonly [string, number]>;
  captureMessages: boolean;
  budget?: number;
}

export interface TenantDataset {
  workspace: Tenant['workspace'];
  billing: Tenant['billing'];
  budgetTotal: number;
  /** percentage of budget at which alerts fire. */
  alertThreshold: number;
  team: TeamMember[];
  defaultModel: string;
  fallbackModel: string;
  bots: DatasetBot[];
  /** seed for the aggregate ("All Chatbots") time series. */
  allSeed: number;
  allTrend: Trend;
  allTopQuestions: ReadonlyArray<readonly [string, number]>;
  /** authored aggregate metrics (seeded tenant only); else undefined → summed. */
  allMetrics?: BotMetrics;
  hourly: number[];
  reports: ReportRow[];
  /** recipient shown on the scheduled-report banner. */
  reportEmail: string;
}

// ---------------------------------------------------------------------------
// Provider / model catalogue (drives the Connect-a-chatbot form).
// ---------------------------------------------------------------------------

export const PROVIDERS: Provider[] = ['OpenAI', 'Anthropic', 'Google', 'Azure OpenAI', 'Custom'];

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  OpenAI: ['GPT-4o', 'GPT-4o mini', 'GPT-4.1', 'GPT-4'],
  Anthropic: ['Claude Opus 4.5', 'Claude Sonnet 4.5', 'Claude Haiku 4.5'],
  Google: ['Gemini 2.5 Pro', 'Gemini 2.5 Flash'],
  'Azure OpenAI': ['GPT-4o', 'GPT-4o mini', 'GPT-4'],
  Custom: ['Custom model'],
};

/** Expected key prefix per provider, used for a light client-side sanity check. */
export const PROVIDER_KEY_HINT: Record<Provider, { prefix: string; example: string }> = {
  OpenAI: { prefix: 'sk-', example: 'sk-proj-…' },
  Anthropic: { prefix: 'sk-ant-', example: 'sk-ant-…' },
  Google: { prefix: 'AIza', example: 'AIza…' },
  'Azure OpenAI': { prefix: '', example: '32-character key' },
  Custom: { prefix: '', example: 'your provider key' },
};

// ---------------------------------------------------------------------------
// Verbatim NY Yankees dataset (authored exactly as in the original design).
// ---------------------------------------------------------------------------

const SEED_METRICS: Record<string, BotMetrics> = {
  stadium: {
    '7d': { users: 444, int: 1866, token: 41.5, plat: 9.33 },
    '30d': { users: 2005, int: 8420, token: 187.3, plat: 42.1 },
    '90d': { users: 5962, int: 25038, token: 556.94, plat: 125.18 },
  },
  ticket: {
    '7d': { users: 234, int: 981, token: 21.54, plat: 4.91 },
    '30d': { users: 1055, int: 4427, token: 97.2, plat: 22.14 },
    '90d': { users: 3138, int: 13164, token: 289.02, plat: 65.83 },
  },
};

const SEED_TREND: Record<string, Trend> = {
  stadium: { cost: 22, token: 22, plat: 6, avgcost: -2 },
  ticket: { cost: 12, token: 12, plat: 4, avgcost: -4 },
};

const SEED_META: Record<string, { last: string }> = {
  stadium: { last: '2 min ago' },
  ticket: { last: '9 min ago' },
};

const SEED_QUESTIONS: Record<string, ReadonlyArray<readonly [string, number]>> = {
  stadium: [
    ['Where do I park?', 412],
    ['What time do gates open?', 356],
    ['How do I find my section?', 301],
    ["What's the bag policy?", 248],
    ['Where are the nearest restrooms?', 193],
    ['What food and drinks are available?', 154],
  ],
  ticket: [
    ['How do I transfer my tickets?', 268],
    ['How do I access my mobile tickets?', 211],
    ['Can I get a refund?', 178],
    ['Can I upgrade my seats?', 132],
    ["I can't find my tickets", 98],
    ['How do I resell my tickets?', 71],
  ],
};

export const YANKEES_ALL_METRICS: BotMetrics = {
  '7d': { users: 678, int: 2847, token: 63.2, plat: 14.24 },
  '30d': { users: 3060, int: 12847, token: 284.5, plat: 64.24 },
  '90d': { users: 9100, int: 38200, token: 849.1, plat: 191.0 },
};

const YANKEES_ALL_TREND: Trend = { cost: 19, token: 22, plat: 5, avgcost: -3 };

const YANKEES_ALL_QUESTIONS: ReadonlyArray<readonly [string, number]> = [
  ['Where do I park?', 428],
  ['How do I transfer my tickets?', 372],
  ['What time do gates open?', 333],
  ['How do I find my section?', 287],
  ['How do I access my mobile tickets?', 241],
  ["What's the bag policy?", 199],
];

const YANKEES_REPORTS: ReportRow[] = [
  { name: 'Monthly Cost Summary', period: 'May 2026', date: 'Jun 1, 2026', cost: '$352.10' },
  { name: 'Token Usage Report', period: 'May 2026', date: 'Jun 1, 2026', cost: '$284.50' },
  { name: 'Chatbot Performance', period: 'May 2026', date: 'Jun 1, 2026', cost: '—' },
  { name: 'Monthly Cost Summary', period: 'Apr 2026', date: 'May 1, 2026', cost: '$318.40' },
  { name: 'Monthly Cost Summary', period: 'Mar 2026', date: 'Apr 1, 2026', cost: '$297.80' },
];

export const YANKEES_TEAM: TeamMember[] = [
  { ini: 'MJ', name: 'Mike Jensen', email: 'mike@nyyankees.com', role: 'Owner' },
  { ini: 'SR', name: 'Sara Reed', email: 'sara@nyyankees.com', role: 'Admin' },
  { ini: 'TK', name: 'Tom Kelly', email: 'tom@nyyankees.com', role: 'Viewer' },
];

/** Relative conversation volume per hour-of-day (0..23). Shared across tenants. */
export const HOURLY_PATTERN: readonly number[] = [
  0.1, 0.06, 0.04, 0.03, 0.03, 0.05, 0.12, 0.25, 0.4, 0.5, 0.55, 0.6, 0.62, 0.6,
  0.58, 0.61, 0.69, 0.81, 0.95, 1.0, 0.9, 0.7, 0.45, 0.24,
];

// ---------------------------------------------------------------------------
// Generators for tenant-created chatbots.
// ---------------------------------------------------------------------------

const GENERIC_QUESTIONS: string[] = [
  'How do I reset my password?',
  'What are your hours?',
  'How do I contact support?',
  'Where is my order?',
  'Can I get a refund?',
  'How do I cancel my subscription?',
  'How do I update my payment method?',
  'Is there a mobile app?',
  'How do I change my plan?',
  'Where can I find my receipt?',
  'How do I track my shipment?',
  'What is your return policy?',
  'How do I redeem a promo code?',
  'Can I speak to a human?',
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Deterministic, internally consistent metrics for one tenant-created bot. */
function genMetrics(seed: number): BotMetrics {
  const r = mulberry32(seed * 2654435761 + 101);
  const users30 = Math.round(600 + r() * 2200); // 600..2800 monthly users
  const msgsPerChat = 3.6 + r() * 1.6; // 3.6..5.2
  const int30 = Math.round(users30 * msgsPerChat);
  const costPerMsg = 0.018 + r() * 0.012; // $0.018..$0.030 / msg
  const platPerMsg = 0.0045 + r() * 0.0015; // $0.0045..$0.006 / msg
  const token30 = round2(int30 * costPerMsg);
  const plat30 = round2(int30 * platPerMsg);
  const f7 = 0.21 + r() * 0.03; // ~22% of the 30d window
  const f90 = 2.85 + r() * 0.25; // ~2.97× the 30d window
  const mk = (f: number): PeriodMetrics => ({
    users: Math.round(users30 * f),
    int: Math.round(int30 * f),
    token: round2(token30 * f),
    plat: round2(plat30 * f),
  });
  return { '7d': mk(f7), '30d': mk(1), '90d': mk(f90) };
}

function genTrend(seed: number): Trend {
  const r = mulberry32(seed * 40503 + 7);
  return {
    cost: Math.round(6 + r() * 18), // +6..+24%
    token: Math.round(6 + r() * 18),
    plat: Math.round(2 + r() * 6), // +2..+8%
    avgcost: Math.round(-5 + r() * 8), // -5..+3%
  };
}

function pickQuestions(seed: number, users30: number): Array<[string, number]> {
  const r = mulberry32(seed * 7919 + 13);
  const pool = [...GENERIC_QUESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  const factors = [0.2, 0.165, 0.14, 0.115, 0.09, 0.07];
  return pool.slice(0, 6).map((q, i) => {
    const jitter = 0.95 + r() * 0.1;
    return [q, Math.max(3, Math.round(users30 * factors[i] * jitter))] as [string, number];
  });
}

/** Volume-weighted blend of the bots' trends for the "All Chatbots" view. */
function blendTrend(bots: DatasetBot[]): Trend {
  if (bots.length === 0) return { cost: 0, token: 0, plat: 0, avgcost: 0 };
  let w = 0;
  let cost = 0;
  let token = 0;
  let plat = 0;
  let avg = 0;
  for (const b of bots) {
    const weight = b.metrics['30d'].token + b.metrics['30d'].plat || 1;
    w += weight;
    cost += b.trend.cost * weight;
    token += b.trend.token * weight;
    plat += b.trend.plat * weight;
    avg += b.trend.avgcost * weight;
  }
  return {
    cost: Math.round(cost / w),
    token: Math.round(token / w),
    plat: Math.round(plat / w),
    avgcost: Math.round(avg / w),
  };
}

/** Merge per-bot questions into a single ranked top-6 for the aggregate view. */
function mergeQuestions(bots: DatasetBot[]): Array<[string, number]> {
  const totals = new Map<string, number>();
  for (const b of bots) {
    for (const [label, count] of b.topQuestions) {
      totals.set(label, (totals.get(label) ?? 0) + count);
    }
  }
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6) as Array<[string, number]>;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Currency format helper kept local to avoid a cross-module dependency. */
function usd(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Generate a small set of recent monthly reports from the tenant's spend. */
function genReports(bots: DatasetBot[]): ReportRow[] {
  if (bots.length === 0) return [];
  const spend30 = bots.reduce((s, b) => s + b.metrics['30d'].token + b.metrics['30d'].plat, 0);
  const tokens30 = bots.reduce((s, b) => s + b.metrics['30d'].token, 0);
  // Anchor to the design's frozen reference month (Jun 2026).
  const ref = new Date(2026, 5, 1);
  const out: ReportRow[] = [];
  for (let i = 0; i < 3; i++) {
    const month = new Date(ref);
    month.setMonth(ref.getMonth() - i);
    const gen = new Date(ref);
    gen.setMonth(ref.getMonth() - i + 1);
    const decay = 1 - i * 0.07;
    out.push({
      name: i === 0 ? 'Monthly Cost Summary' : 'Monthly Cost Summary',
      period: `${MONTHS[month.getMonth()]} ${month.getFullYear()}`,
      date: `${MONTHS[gen.getMonth()]} 1, ${gen.getFullYear()}`,
      cost: usd(round2(spend30 * decay)),
    });
  }
  out.splice(1, 0, {
    name: 'Token Usage Report',
    period: `${MONTHS[ref.getMonth()]} ${ref.getFullYear()}`,
    date: `${MONTHS[(ref.getMonth() + 1) % 12]} 1, 2026`,
    cost: usd(round2(tokens30)),
  });
  return out;
}

function relativeFromNow(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'recently';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function providerModelLabel(provider: Provider, model: string): string {
  return `${provider} · ${model}`;
}

/** Inert dataset used only as a non-null fallback before a tenant is loaded. */
export const EMPTY_DATASET: TenantDataset = {
  workspace: { name: '—', timezone: 'UTC', currency: 'USD' },
  billing: { plan: 'Starter', planPrice: '$0', nextInvoice: '—', paymentMethod: '—' },
  budgetTotal: 0,
  alertThreshold: 80,
  team: [],
  defaultModel: '',
  fallbackModel: '',
  bots: [],
  allSeed: 0,
  allTrend: { cost: 0, token: 0, plat: 0, avgcost: 0 },
  allTopQuestions: [],
  allMetrics: undefined,
  hourly: [...HOURLY_PATTERN],
  reports: [],
  reportEmail: '—',
};

// ---------------------------------------------------------------------------
// getDatasetForTenant — the bridge from persisted Tenant to computed dataset.
// ---------------------------------------------------------------------------

export function getDatasetForTenant(tenant: Tenant): TenantDataset {
  const bots: DatasetBot[] = tenant.chatbots.map((c) => {
    const metrics = SEED_METRICS[c.key] ?? genMetrics(c.seed);
    const trend = SEED_TREND[c.key] ?? genTrend(c.seed);
    const topQuestions = SEED_QUESTIONS[c.key] ?? pickQuestions(c.seed, metrics['30d'].users);
    return {
      key: c.key,
      id: c.id,
      name: c.name,
      provider: c.provider,
      model: c.model,
      modelLabel: providerModelLabel(c.provider, c.model),
      last: SEED_META[c.key]?.last ?? relativeFromNow(c.createdAt),
      keyMasked: c.keyMasked,
      status: c.status,
      seed: c.seed,
      metrics,
      trend,
      topQuestions,
      captureMessages: c.captureMessages,
      budget: c.budget,
    };
  });

  const pristineYankees =
    !!tenant.seeded &&
    tenant.chatbots.length === 2 &&
    tenant.chatbots.every((c) => c.key === 'stadium' || c.key === 'ticket');

  const slug =
    tenant.workspace.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 24) || 'workspace';

  return {
    workspace: tenant.workspace,
    billing: tenant.billing,
    budgetTotal: tenant.budgetTotal,
    alertThreshold: tenant.alertThreshold,
    team: tenant.team,
    defaultModel: tenant.defaultModel,
    fallbackModel: tenant.fallbackModel,
    bots,
    allSeed: tenant.seeded ? 3 : hashSeed(tenant.id),
    allTrend: pristineYankees ? YANKEES_ALL_TREND : blendTrend(bots),
    allTopQuestions: pristineYankees ? YANKEES_ALL_QUESTIONS : mergeQuestions(bots),
    allMetrics: pristineYankees ? YANKEES_ALL_METRICS : undefined,
    hourly: [...HOURLY_PATTERN],
    reports: pristineYankees ? YANKEES_REPORTS : genReports(bots),
    reportEmail: pristineYankees ? 'billing@nyyankees.com' : `billing@${slug}.com`,
  };
}
