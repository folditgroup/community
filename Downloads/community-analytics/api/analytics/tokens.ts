import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../_lib/auth';
import { getAdminClient } from '../_lib/supabase';
import { analyticsQuerySchema } from '../_lib/validate';
import { periodStartIso } from '../_lib/period';

interface DayBucket {
  date: string;
  promptTokens: number;
  completionTokens: number;
  tokenCost: number;
  platformCost: number;
}

// GET /api/analytics/tokens — token usage over time (daily buckets).
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
      .select('prompt_tokens, completion_tokens, token_cost_usd, platform_cost_usd, created_at')
      .eq('tenant_id', auth.tenantId)
      .gte('created_at', periodStartIso(period))
      .order('created_at', { ascending: true });
    if (chatbot_id) query = query.eq('chatbot_id', chatbot_id);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: 'Server error' });
      return;
    }

    const buckets = new Map<string, DayBucket>();
    for (const r of data ?? []) {
      const day = String(r.created_at).slice(0, 10); // YYYY-MM-DD
      const b = buckets.get(day) ?? {
        date: day,
        promptTokens: 0,
        completionTokens: 0,
        tokenCost: 0,
        platformCost: 0,
      };
      b.promptTokens += Number(r.prompt_tokens) || 0;
      b.completionTokens += Number(r.completion_tokens) || 0;
      b.tokenCost += Number(r.token_cost_usd) || 0;
      b.platformCost += Number(r.platform_cost_usd) || 0;
      buckets.set(day, b);
    }

    const series = Array.from(buckets.values()).map((b) => ({
      ...b,
      tokenCost: Number(b.tokenCost.toFixed(2)),
      platformCost: Number(b.platformCost.toFixed(2)),
    }));

    res.status(200).json({ period, series });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
