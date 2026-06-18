import type { PeriodMetrics, Period, Series } from '../types';

// Formatters (ported verbatim from the design prototype so that every rendered
// value — including chart axis ticks — matches the reference pixel-for-pixel).

/** "$1,234.50" — always two decimals. */
export function formatCurrency(n: number): string {
  return (
    '$' +
    Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** "12,847" — rounded integer with thousands separators. */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** Compact notation: 9_506_780 -> "9.5M", 108_250 -> "108K". */
export function formatCompact(n: number): string {
  const v = Math.round(n);
  if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(v >= 1e4 ? 0 : 1) + 'K';
  return '' + v;
}

/** "+19%" / "-3%". */
export function formatSign(v: number): string {
  return (v >= 0 ? '+' : '') + v + '%';
}

// Deterministic series generation.

/** mulberry32 PRNG — deterministic for a given seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** "custom" maps to the 30-day dataset (placeholder for a real date picker). */
export function resolveKey(period: Period): '7d' | '30d' | '90d' {
  return period === 'custom' ? '30d' : period;
}

/** Number of data points for the period. */
export function periodDays(period: Period): number {
  const map: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90, custom: 30 };
  return map[period];
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Build N day labels ending on Jun 16, 2026 (the date frozen into the design
 * reference, so the X-axis reads "May 18 … Jun 16" for the 30-day view).
 */
function buildDates(n: number): string[] {
  const base = new Date(2026, 5, 16); // Jun 16, 2026
  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - (n - 1 - i));
    dates.push(MONTHS[d.getMonth()] + ' ' + d.getDate());
  }
  return dates;
}

const PERIOD_SEED: Record<'7d' | '30d' | '90d', number> = { '7d': 17, '30d': 53, '90d': 91 };

/**
 * Stable, well-spread integer seed derived from a string (FNV-1a). Used to give
 * every connected chatbot deterministic-but-distinct synthesized metrics. The
 * seeded NY Yankees bots use fixed seeds (3/7/11) so their charts reproduce the
 * original design exactly; this is only for tenant-created bots.
 */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Map to a small positive range to keep series weights well-conditioned.
  return (h >>> 0) % 9973;
}

/**
 * Generate the daily time series for a (seed, period). The weights ramp up
 * gently across the window and are normalised so each series sums to the exact
 * period total in `cur`. Token & platform share the same shape; conversations
 * use an independent draw. Token split is 62% prompt / 38% completion.
 */
export function buildSeries(seed: number, period: Period, cur: PeriodMetrics): Series {
  const key = resolveKey(period);
  const n = periodDays(period);
  const seedBase = PERIOD_SEED[key] + seed;
  const r = mulberry32(seedBase * 1000 + 7);

  const wC: number[] = [];
  const wU: number[] = [];
  for (let i = 0; i < n; i++) {
    const ramp = 0.78 + 0.5 * (n === 1 ? 1 : i / (n - 1));
    wC.push((0.5 + r()) * ramp);
    wU.push((0.5 + r()) * ramp);
  }
  const sumC = wC.reduce((a, b) => a + b, 0);
  const sumU = wU.reduce((a, b) => a + b, 0);
  const totalTok = cur.int * 740;

  const token = wC.map((w) => (w / sumC) * cur.token);
  const platform = wC.map((w) => (w / sumC) * cur.plat);
  const promptTok = wC.map((w) => (w / sumC) * totalTok * 0.62);
  const complTok = wC.map((w) => (w / sumC) * totalTok * 0.38);
  const conversations = wU.map((w) => Math.round((w / sumU) * cur.users));
  const dates = buildDates(n);

  const points = dates.map((date, i) => ({
    date,
    token: token[i],
    platform: platform[i],
    promptTok: promptTok[i],
    complTok: complTok[i],
    conversations: conversations[i],
  }));

  return { n, dates, token, platform, promptTok, complTok, conversations, points };
}

/** Evenly-spaced tick values [0, .25, .5, .75, 1] * max for a chart Y-axis. */
export function axisTicks(max: number): number[] {
  return [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);
}

/**
 * Pick up to `count` evenly-spaced labels from `dates` for a chart X-axis,
 * mirroring the reference (min(6, n) labels including first and last).
 */
export function pickXTicks(dates: string[], count = 6): string[] {
  const n = dates.length;
  const xCount = Math.min(count, n);
  const ticks: string[] = [];
  for (let k = 0; k < xCount; k++) {
    const i = Math.round((k * (n - 1)) / (xCount - 1 || 1));
    ticks.push(dates[i]);
  }
  return ticks;
}
