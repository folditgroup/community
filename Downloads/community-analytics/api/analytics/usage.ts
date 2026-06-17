import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../_lib/auth';
import { getAdminClient } from '../_lib/supabase';
import { analyticsQuerySchema } from '../_lib/validate';
import { periodStartIso } from '../_lib/period';

// GET /api/analytics/usage — usage-page stats: totals, per-model, busiest hours.
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

  const parsed = analyticsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }
  const { period, chatbot_id } = parsed.data;

  try {
    const supabase = getAdminClient();
    let query = supabase
      .from('usage_events')
      .select('total_tokens, token_cost_usd, model, hour_of_day')
      .eq('tenant_id', auth.tenantId)
      .gte('created_at', periodStartIso(period));
    if (chatbot_id) query = query.eq('chatbot_id', chatbot_id);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: 'Server error' });
      return;
    }

    const rows = data ?? [];
    let messages = 0;
    let totalTokens = 0;
    let tokenCost = 0;
    const byModel = new Map<string, { messages: number; tokens: number; cost: number }>();
    const byHour = new Array<number>(24).fill(0);

    for (const r of rows) {
      messages += 1;
      totalTokens += Number(r.total_tokens) || 0;
      tokenCost += Number(r.token_cost_usd) || 0;

      const model = String(r.model);
      const m = byModel.get(model) ?? { messages: 0, tokens: 0, cost: 0 };
      m.messages += 1;
      m.tokens += Number(r.total_tokens) || 0;
      m.cost += Number(r.token_cost_usd) || 0;
      byModel.set(model, m);

      const hour = Number(r.hour_of_day);
      if (Number.isInteger(hour) && hour >= 0 && hour < 24) byHour[hour] += 1;
    }

    res.status(200).json({
      period,
      messages,
      totalTokens,
      avgTokensPerMsg: messages ? Math.round(totalTokens / messages) : 0,
      tokenCost: Number(tokenCost.toFixed(2)),
      byModel: Array.from(byModel.entries()).map(([model, v]) => ({
        model,
        messages: v.messages,
        tokens: v.tokens,
        cost: Number(v.cost.toFixed(2)),
      })),
      byHour,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
