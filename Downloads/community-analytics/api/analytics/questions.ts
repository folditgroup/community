import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../_lib/auth';
import { getAdminClient } from '../_lib/supabase';
import { analyticsQuerySchema } from '../_lib/validate';

// GET /api/analytics/questions — the most frequently asked questions for the
// tenant (optionally a single chatbot). Reads the aggregated top_questions
// table; returns the top 6 with their share of the total.
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
  const { chatbot_id } = parsed.data;

  try {
    const supabase = getAdminClient();

    let query = supabase
      .from('top_questions')
      .select('question, ask_count')
      .eq('tenant_id', auth.tenantId)
      .order('ask_count', { ascending: false })
      .limit(6);

    if (chatbot_id) query = query.eq('chatbot_id', chatbot_id);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: 'Server error' });
      return;
    }

    const rows = data ?? [];
    const total = rows.reduce((s, r) => s + (Number(r.ask_count) || 0), 0);
    const top = rows[0]?.ask_count ?? 0;

    const questions = rows.map((r, i) => {
      const count = Number(r.ask_count) || 0;
      return {
        rank: i + 1,
        label: r.question as string,
        count,
        share: total ? Number(((count / total) * 100).toFixed(1)) : 0,
        barPct: top ? Math.round((count / Number(top)) * 100) : 0,
      };
    });

    res.status(200).json({ questions });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
