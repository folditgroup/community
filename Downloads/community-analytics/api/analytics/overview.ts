import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../_lib/auth';
import { getAdminClient } from '../_lib/supabase';
import { analyticsQuerySchema } from '../_lib/validate';
import { periodStartIso } from '../_lib/period';

// GET /api/analytics/overview — dashboard cost stats for the tenant.
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
      .select('token_cost_usd, platform_cost_usd, conversation_id')
      .eq('tenant_id', auth.tenantId)
      .gte('created_at', periodStartIso(period));
    if (chatbot_id) query = query.eq('chatbot_id', chatbot_id);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: 'Server error' });
      return;
    }

    const rows = data ?? [];
    let tokenCost = 0;
    let platformCost = 0;
    const users = new Set<string>();
    for (const r of rows) {
      tokenCost += Number(r.token_cost_usd) || 0;
      platformCost += Number(r.platform_cost_usd) || 0;
      if (r.conversation_id) users.add(r.conversation_id);
    }
    const totalCost = tokenCost + platformCost;
    const userCount = users.size;

    res.status(200).json({
      period,
      totalCost: Number(totalCost.toFixed(2)),
      tokenCost: Number(tokenCost.toFixed(2)),
      platformCost: Number(platformCost.toFixed(2)),
      avgCostPerChat: userCount ? Number((totalCost / userCount).toFixed(2)) : 0,
      activeUsers: userCount,
      messages: rows.length,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
