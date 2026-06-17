import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../_lib/auth';
import { getAdminClient } from '../_lib/supabase';
import { analyticsQuerySchema } from '../_lib/validate';
import { periodStartIso } from '../_lib/period';

interface BotAgg {
  messages: number;
  tokenCost: number;
  platformCost: number;
  users: Set<string>;
}

// GET /api/analytics/chatbots — chatbot list with per-bot stats for the period.
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
  const { period } = parsed.data;

  try {
    const supabase = getAdminClient();

    const { data: bots, error: botsErr } = await supabase
      .from('chatbots')
      .select('id, name, openai_model, is_active')
      .eq('tenant_id', auth.tenantId)
      .order('created_at', { ascending: true });
    if (botsErr) {
      res.status(500).json({ error: 'Server error' });
      return;
    }

    const { data: events, error: evErr } = await supabase
      .from('usage_events')
      .select('chatbot_id, conversation_id, token_cost_usd, platform_cost_usd')
      .eq('tenant_id', auth.tenantId)
      .gte('created_at', periodStartIso(period));
    if (evErr) {
      res.status(500).json({ error: 'Server error' });
      return;
    }

    const agg = new Map<string, BotAgg>();
    for (const e of events ?? []) {
      const id = String(e.chatbot_id);
      const a =
        agg.get(id) ?? { messages: 0, tokenCost: 0, platformCost: 0, users: new Set<string>() };
      a.messages += 1;
      a.tokenCost += Number(e.token_cost_usd) || 0;
      a.platformCost += Number(e.platform_cost_usd) || 0;
      if (e.conversation_id) a.users.add(e.conversation_id);
      agg.set(id, a);
    }

    const chatbots = (bots ?? []).map((b) => {
      const a = agg.get(b.id) ?? {
        messages: 0,
        tokenCost: 0,
        platformCost: 0,
        users: new Set<string>(),
      };
      const userCount = a.users.size;
      const totalCost = a.tokenCost + a.platformCost;
      return {
        id: b.id,
        name: b.name,
        model: b.openai_model,
        isActive: b.is_active,
        activeUsers: userCount,
        totalCost: Number(totalCost.toFixed(2)),
        avgMsgs: userCount ? Number((a.messages / userCount).toFixed(1)) : 0,
      };
    });

    res.status(200).json({ period, chatbots });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
