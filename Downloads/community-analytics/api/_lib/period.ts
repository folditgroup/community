// ---------------------------------------------------------------------------
// Period helpers shared by the analytics endpoints.
// ---------------------------------------------------------------------------

export type Period = '7d' | '30d' | '90d' | 'custom';

/** Number of days in the window ("custom" -> 30, a placeholder for a picker). */
export function periodDays(period: Period): number {
  switch (period) {
    case '7d':
      return 7;
    case '90d':
      return 90;
    case '30d':
    case 'custom':
    default:
      return 30;
  }
}

/** ISO timestamp for the start of the window (now - N days). */
export function periodStartIso(period: Period): string {
  const start = new Date();
  start.setDate(start.getDate() - periodDays(period));
  return start.toISOString();
}
