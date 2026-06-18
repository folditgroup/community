import type {
  BotMetrics,
  ChatbotFilter,
  ChatbotKey,
  MockData,
  ModelRow,
  PeriodMetrics,
  Period,
  ProviderStatus,
  SettingsData,
  Trend,
} from '../types';
import type { DatasetBot, TenantDataset } from './dataset';
import {
  buildSeries,
  formatCompact,
  formatCurrency,
  formatNumber,
  formatSign,
  resolveKey,
} from './utils';

// buildAnalytics — the single entry point. Given a tenant's computed dataset
// and a (chatbot, period) selection, returns every metric a page needs.
//
// The seeded NY Yankees tenant reproduces the original design output exactly;
// tenant-created chatbots flow through the same code with generated metrics.

const RANGE_LABEL: Record<Period, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  custom: 'Last 30 days',
};

const ZERO: PeriodMetrics = { users: 0, int: 0, token: 0, plat: 0 };

function sumMetrics(bots: DatasetBot[], key: '7d' | '30d' | '90d'): PeriodMetrics {
  return bots.reduce<PeriodMetrics>(
    (acc, b) => {
      const m = b.metrics[key];
      return {
        users: acc.users + m.users,
        int: acc.int + m.int,
        token: acc.token + m.token,
        plat: acc.plat + m.plat,
      };
    },
    { ...ZERO },
  );
}

/** Aggregate metrics for the "All Chatbots" view across the three windows. */
function aggregateMetrics(ds: TenantDataset): BotMetrics {
  if (ds.allMetrics) return ds.allMetrics;
  return {
    '7d': sumMetrics(ds.bots, '7d'),
    '30d': sumMetrics(ds.bots, '30d'),
    '90d': sumMetrics(ds.bots, '90d'),
  };
}

interface Scope {
  cur: PeriodMetrics;
  metrics30: PeriodMetrics;
  trend: Trend;
  seed: number;
  topQuestions: ReadonlyArray<readonly [string, number]>;
  botLabel: string;
  /** bots included in the Chatbot Breakdown table for this scope. */
  rowsBots: DatasetBot[];
}

function resolveScope(ds: TenantDataset, chatbot: ChatbotFilter, key: '7d' | '30d' | '90d'): Scope {
  const bot = chatbot === 'all' ? undefined : ds.bots.find((b) => b.key === chatbot);

  if (!bot) {
    const agg = aggregateMetrics(ds);
    return {
      cur: agg[key],
      metrics30: agg['30d'],
      trend: ds.allTrend,
      seed: ds.allSeed,
      topQuestions: ds.allTopQuestions,
      botLabel: 'all bots',
      rowsBots: ds.bots,
    };
  }

  return {
    cur: bot.metrics[key],
    metrics30: bot.metrics['30d'],
    trend: bot.trend,
    seed: bot.seed,
    topQuestions: bot.topQuestions,
    botLabel: 'the ' + bot.name,
    rowsBots: [bot],
  };
}

function avgCost(total: number, users: number): string {
  return '$' + (users > 0 ? total / users : 0).toFixed(2);
}

function perChat(int: number, users: number): string {
  return (users > 0 ? int / users : 0).toFixed(1);
}

function buildModelRows(
  ds: TenantDataset,
  cur: PeriodMetrics,
  scopeBots: TenantDataset['bots'],
  key: '7d' | '30d' | '90d',
): ModelRow[] {
  // Live (Supabase) data: real breakdown. Each bot has exactly one model, so
  // grouping the in-scope bots by model gives exact cost/messages for the
  // selected period (token counts are estimated app-wide at ~740/msg).
  if (ds.live) {
    const byModel = new Map<string, { int: number; token: number }>();
    for (const b of scopeBots) {
      const d = b.metrics[key];
      const agg = byModel.get(b.model) ?? { int: 0, token: 0 };
      agg.int += d.int;
      agg.token += d.token;
      byModel.set(b.model, agg);
    }
    return Array.from(byModel.entries())
      .filter(([, v]) => v.int > 0 || v.token > 0)
      .sort((a, b) => b[1].token - a[1].token)
      .map(([model, v], i) => ({
        model,
        dot: i === 0 ? 'green' : 'black',
        msgs: formatNumber(v.int),
        tokens: formatCompact(v.int * 740),
        cost: formatCurrency(v.token),
      }));
  }

  const totalTok = cur.int * 740;
  // Single-model tenants collapse to one row; otherwise default/fallback split.
  if (ds.defaultModel === ds.fallbackModel || ds.bots.length === 0) {
    return [
      {
        model: ds.defaultModel,
        dot: 'green',
        msgs: formatNumber(cur.int),
        tokens: formatCompact(totalTok),
        cost: formatCurrency(cur.token),
      },
    ];
  }
  const g4Msg = Math.round(cur.int * 0.7);
  return [
    {
      model: ds.defaultModel,
      dot: 'green',
      msgs: formatNumber(g4Msg),
      tokens: formatCompact(totalTok * 0.78),
      cost: formatCurrency(cur.token * 0.85),
    },
    {
      model: ds.fallbackModel,
      dot: 'black',
      msgs: formatNumber(cur.int - g4Msg),
      tokens: formatCompact(totalTok * 0.22),
      cost: formatCurrency(cur.token * 0.15),
    },
  ];
}

function buildProviderStatuses(ds: TenantDataset): ProviderStatus[] {
  const counts = new Map<string, number>();
  for (const b of ds.bots) counts.set(b.provider, (counts.get(b.provider) ?? 0) + 1);
  return Array.from(counts.entries()).map(([provider, count]) => ({
    provider,
    connected: true,
    count,
  }));
}

function buildSettings(ds: TenantDataset): SettingsData {
  const all30 = aggregateMetrics(ds)['30d'];
  const spend = all30.token + all30.plat;
  const budget = ds.budgetTotal;
  const pct = budget > 0 ? Math.round((spend / budget) * 100) : 0;
  const providers = buildProviderStatuses(ds);
  return {
    workspace: ds.workspace,
    billing: ds.billing,
    budget: {
      spend: formatCurrency(spend),
      total: formatCurrency(budget),
      barPct: Math.min(100, pct),
      pctText: pct + '% of monthly budget used',
    },
    alertThreshold: ds.alertThreshold,
    provider: {
      connected: providers.length > 0,
      providers,
      defaultModel: ds.defaultModel,
      fallbackModel: ds.fallbackModel,
    },
    team: ds.team,
  };
}

export function buildAnalytics(
  ds: TenantDataset,
  chatbot: ChatbotFilter,
  period: Period,
): MockData {
  const key = resolveKey(period);
  const hourly = ds.hourly;
  const hourlyPeak = hourly.indexOf(Math.max(...hourly));
  const scope = resolveScope(ds, chatbot, key);
  const { cur } = scope;
  const total = cur.token + cur.plat;
  const series = buildSeries(scope.seed, period, cur);

  // ---- Dashboard stat cards ----
  const cards = [
    { label: 'Total Cost', value: formatCurrency(total), trendPct: scope.trend.cost },
    { label: 'Token Cost', value: formatCurrency(cur.token), trendPct: scope.trend.token },
    { label: 'Platform Cost', value: formatCurrency(cur.plat), trendPct: scope.trend.plat },
    { label: 'Avg Cost / Chat', value: avgCost(total, cur.users), trendPct: scope.trend.avgcost },
  ];

  // ---- Chatbot breakdown rows ----
  const rows = scope.rowsBots.map((b) => {
    const d = b.metrics[key];
    return {
      name: b.name,
      users: formatNumber(d.users),
      avgMsgs: perChat(d.int, d.users),
      token: formatCurrency(d.token),
      plat: formatCurrency(d.plat),
      total: formatCurrency(d.token + d.plat),
      trend: formatSign(b.trend.cost),
    };
  });

  // ---- Most frequent messages ----
  const base30Users = scope.metrics30.users || 1;
  const userScale = base30Users > 0 ? cur.users / base30Users : 0;
  const maxBase = scope.topQuestions.length > 0 ? scope.topQuestions[0][1] : 1;
  const topMessages = scope.topQuestions.map(([label, count], i) => ({
    rank: i + 1,
    label,
    count: formatNumber(count * userScale),
    share: ((count / base30Users) * 100).toFixed(1) + '%',
    barPct: Math.round((count / maxBase) * 100),
  }));

  // ---- Chatbots page (always lists every connected bot for the period) ----
  const chatbotCards = ds.bots.map((b): MockData['chatbotCards'][number] => {
    const d = b.metrics[key];
    return {
      key: b.key,
      id: b.id,
      name: b.name,
      provider: b.provider,
      model: b.model,
      modelLabel: b.modelLabel,
      keyMasked: b.keyMasked,
      last: b.last,
      users: formatNumber(d.users),
      cost: formatCurrency(d.token + d.plat),
      avgMsgs: perChat(d.int, d.users),
      active: b.status === 'connected',
      budget: b.budget,
      captureMessages: b.captureMessages,
    };
  });

  // ---- Usage page ----
  const totalTok = cur.int * 740;
  const usageCards = [
    { label: 'Total Messages', value: formatNumber(cur.int), trendPct: scope.trend.cost },
    { label: 'Tokens Used', value: formatCompact(totalTok), trendPct: scope.trend.token },
    { label: 'Avg Tokens / Msg', value: cur.int > 0 ? '740' : '0', trendPct: 1 },
    { label: 'Token Cost', value: formatCurrency(cur.token), trendPct: scope.trend.token },
  ];

  return {
    rangeLabel: RANGE_LABEL[period],
    botLabel: scope.botLabel,
    cards,
    series,
    usersValue: formatNumber(cur.users),
    msgPerChat: perChat(cur.int, cur.users),
    donut: { token: cur.token, plat: cur.plat, total },
    topMessages,
    rows,
    botCount: ds.bots.length,
    chatbotCards,
    usageCards,
    modelRows: buildModelRows(ds, cur, scope.rowsBots, key),
    hourly: [...hourly],
    hourlyPeak,
    reports: ds.reports,
    settings: buildSettings(ds),
  };
}

// Re-export for any legacy import sites.
export type { ChatbotKey };
