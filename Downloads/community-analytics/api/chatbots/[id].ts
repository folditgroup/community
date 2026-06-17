import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../_lib/auth';
import { getAdminClient } from '../_lib/supabase';
import { chatbotUpdateSchema } from '../_lib/validate';

// /api/chatbots/[id]
//   PATCH  -> update fields (name/provider/model/capture/budget)
//   DELETE -> remove the bot (its usage_events + top_questions cascade away)
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const auth = await authenticate(req);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const id = req.query.id;
  if (typeof id !== 'string' || !id) {
    res.status(400).json({ error: 'Missing chatbot id' });
    return;
  }

  const supabase = getAdminClient();

  if (req.method === 'PATCH') {
    const parsed = chatbotUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    const p = parsed.data;
    const patch: Record<string, unknown> = {};
    if (p.name !== undefined) patch.name = p.name;
    if (p.provider !== undefined) patch.provider = p.provider;
    if (p.model !== undefined) patch.openai_model = p.model;
    if (p.capture_messages !== undefined) patch.capture_messages = p.capture_messages;
    if (p.monthly_budget_usd !== undefined) patch.monthly_budget_usd = p.monthly_budget_usd;

    // Scope the update to this tenant so one tenant cannot touch another's bot.
    const { error } = await supabase
      .from('chatbots')
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', auth.tenantId);
    if (error) {
      res.status(500).json({ error: 'Could not update chatbot' });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('chatbots')
      .delete()
      .eq('id', id)
      .eq('tenant_id', auth.tenantId);
    if (error) {
      res.status(500).json({ error: 'Could not delete chatbot' });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', 'PATCH, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
}
