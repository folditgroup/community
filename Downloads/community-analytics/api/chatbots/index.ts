import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../_lib/auth';
import { getAdminClient } from '../_lib/supabase';
import { chatbotCreateSchema } from '../_lib/validate';

// /api/chatbots
//   GET  -> list this tenant's chatbots
//   POST -> create a chatbot, returns the new row (incl. its id)
// The provider API key is intentionally NOT sent or stored — bots authenticate
// usage events with WEBHOOK_SECRET, not their provider key.
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const auth = await authenticate(req);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabase = getAdminClient();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('chatbots')
      .select('id, name, provider, openai_model, capture_messages, monthly_budget_usd, is_active, created_at')
      .eq('tenant_id', auth.tenantId)
      .order('created_at', { ascending: true });
    if (error) {
      res.status(500).json({ error: 'Server error' });
      return;
    }
    res.status(200).json({ chatbots: data ?? [] });
    return;
  }

  if (req.method === 'POST') {
    const parsed = chatbotCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    const b = parsed.data;
    const { data, error } = await supabase
      .from('chatbots')
      .insert({
        tenant_id: auth.tenantId,
        name: b.name,
        provider: b.provider,
        openai_model: b.model,
        capture_messages: b.capture_messages ?? false,
        monthly_budget_usd: b.monthly_budget_usd ?? null,
      })
      .select('id, name, provider, openai_model, capture_messages, monthly_budget_usd, is_active, created_at')
      .single();
    if (error || !data) {
      res.status(500).json({ error: 'Could not create chatbot' });
      return;
    }
    res.status(201).json({ chatbot: data });
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
}
