import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { authenticate } from '../_lib/auth';
import { getAdminClient } from '../_lib/supabase';

const tenantUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    monthly_budget_usd: z.number().positive(),
    alert_threshold_pct: z.number().int().min(1).max(100),
  })
  .partial();

// PATCH /api/tenant — update the caller's workspace (budget, alert threshold, name).
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = await authenticate(req);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = tenantUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const { error } = await getAdminClient()
    .from('tenants')
    .update(parsed.data)
    .eq('id', auth.tenantId);
  if (error) {
    res.status(500).json({ error: 'Could not update workspace' });
    return;
  }
  res.status(200).json({ ok: true });
}
