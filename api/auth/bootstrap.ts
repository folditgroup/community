import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateUser } from '../_lib/auth';
import { getAdminClient } from '../_lib/supabase';

// POST /api/auth/bootstrap — idempotently ensure the user has a tenant. If the
// tenant_id claim is missing, create the tenant + a default message rate and
// stamp app_metadata.tenant_id. On a fresh create the client must
// refreshSession() so the new JWT carries the claim every other endpoint reads.

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 32) || 'workspace'
  );
}

interface TenantRow {
  id: string;
  name: string;
  monthly_budget_usd: number | string;
  alert_threshold_pct: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = await authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabase = getAdminClient();

  try {
    if (user.tenantId) {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, monthly_budget_usd, alert_threshold_pct')
        .eq('id', user.tenantId)
        .single<TenantRow>();
      if (!error && data) {
        res.status(200).json({ tenant: data, created: false });
        return;
      }
      // claim points at a missing tenant — fall through and recreate
    }

    const body = (req.body ?? {}) as { workspaceName?: string };
    const emailLocal = user.email ? user.email.split('@')[0] : '';
    const name =
      (body.workspaceName ?? '').trim() ||
      (emailLocal ? emailLocal + "'s workspace" : 'My Workspace');
    const slug = slugify(name) + '-' + user.userId.slice(0, 8);

    const { data: tenant, error: tErr } = await supabase
      .from('tenants')
      .insert({ name, slug })
      .select('id, name, monthly_budget_usd, alert_threshold_pct')
      .single<TenantRow>();
    if (tErr || !tenant) {
      res.status(500).json({ error: 'Could not create workspace' });
      return;
    }

    // Default platform message rate so platform cost is non-zero once events flow.
    await supabase
      .from('message_rates')
      .insert({ tenant_id: tenant.id, rate_per_message: 0.005 });

    // Stamp the tenant claim onto the user (trusted app_metadata).
    const { error: claimErr } = await supabase.auth.admin.updateUserById(user.userId, {
      app_metadata: { tenant_id: tenant.id },
    });
    if (claimErr) {
      res.status(500).json({ error: 'Could not finalize workspace' });
      return;
    }

    res.status(200).json({ tenant, created: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
