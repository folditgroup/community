import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { getAdminClient } from '../_lib/supabase';
import { usageWebhookSchema } from '../_lib/validate';

// ---------------------------------------------------------------------------
// POST /api/webhook/usage
// Receives a usage event from Node-RED, authenticates with a shared secret,
// computes token cost, and inserts a row into usage_events (service role).
// Never exposes internal error details to the caller.
// ---------------------------------------------------------------------------

/** OpenAI pricing in USD per 1,000,000 tokens (input / output). */
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4': { input: 30.0, output: 60.0 },
};

function priceFor(model: string): { input: number; output: number } {
  const key = model.trim().toLowerCase();
  return PRICING[key] ?? PRICING['gpt-4o'];
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Normalize an end-user message into a grouping key + display form for the
 * top-questions aggregate. Collapses whitespace, strips wrapping quotes, caps
 * length, and lowercases the key. Returns null if nothing usable remains.
 */
function normalizeQuestion(raw: string): { key: string; display: string } | null {
  let s = raw.replace(/\s+/g, ' ').trim();
  s = s.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  if (s.length === 0) return null;
  const display = s.length > 120 ? s.slice(0, 117).trimEnd() + '…' : s;
  return { key: display.toLowerCase(), display };
}

/** Constant-time string comparison that never throws on length mismatch. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
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

  // Body may arrive as a parsed object or a raw string depending on headers.
  let body: unknown = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
  }

  const parsed = usageWebhookSchema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }
  const input = parsed.data;

  // Authenticate the webhook with a constant-time secret comparison.
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (!expectedSecret) {
    res.status(500).json({ error: 'Server error' });
    return;
  }
  if (!secretMatches(input.webhook_secret, expectedSecret)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const supabase = getAdminClient();

    // Resolve the chatbot's tenant (usage_events.tenant_id is NOT NULL).
    const { data: chatbot, error: botErr } = await supabase
      .from('chatbots')
      .select('id, tenant_id, capture_messages')
      .eq('id', input.chatbot_id)
      .single();

    if (botErr || !chatbot) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    // Token cost from model pricing.
    const price = priceFor(input.model);
    const tokenCost = round6(
      (input.prompt_tokens / 1e6) * price.input +
        (input.completion_tokens / 1e6) * price.output,
    );

    // Platform cost = latest message rate × message_count (0 if no rate set).
    let platformCost = 0;
    const { data: rate } = await supabase
      .from('message_rates')
      .select('rate_per_message')
      .eq('tenant_id', chatbot.tenant_id)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (rate && typeof rate.rate_per_message === 'number') {
      platformCost = round6(rate.rate_per_message * input.message_count);
    }

    const hourOfDay = new Date().getUTCHours();

    const { error: insertErr } = await supabase.from('usage_events').insert({
      tenant_id: chatbot.tenant_id,
      chatbot_id: input.chatbot_id,
      conversation_id: input.conversation_id,
      prompt_tokens: input.prompt_tokens,
      completion_tokens: input.completion_tokens,
      total_tokens: input.total_tokens,
      token_cost_usd: tokenCost,
      platform_cost_usd: platformCost,
      model: input.model,
      hour_of_day: hourOfDay,
    });

    if (insertErr) {
      res.status(500).json({ error: 'Server error' });
      return;
    }

    // Optionally record the question for the "Most Frequent Messages" panel.
    // Only when the bot opted in AND text was provided. Best-effort: a failure
    // here must not fail the usage event that already succeeded.
    if (chatbot.capture_messages && input.user_message) {
      const q = normalizeQuestion(input.user_message);
      if (q) {
        await supabase.rpc('bump_top_question', {
          p_tenant_id: chatbot.tenant_id,
          p_chatbot_id: input.chatbot_id,
          p_key: q.key,
          p_question: q.display,
        });
      }
    }

    res.status(200).json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
