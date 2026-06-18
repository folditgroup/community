import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { getAdminClient } from '../_lib/supabase';
import { usageWebhookSchema } from '../_lib/validate';

// USD per 1,000,000 tokens (input, output).
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-2024-08-06': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1': { input: 2.0, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'o3-mini': { input: 1.1, output: 4.4 },
  'o1-mini': { input: 1.1, output: 4.4 },
};

function priceFor(model: string): { input: number; output: number } {
  const key = model.trim().toLowerCase();
  if (PRICING[key]) return PRICING[key];
  for (const known of Object.keys(PRICING)) {
    if (key.startsWith(known)) return PRICING[known]; // e.g. gpt-4o-2024-… -> gpt-4o
  }
  return PRICING['gpt-4o'];
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function normalizeQuestion(raw: string): { key: string; display: string } | null {
  let s = raw.replace(/\s+/g, ' ').trim();
  s = s.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  if (s.length === 0) return null;
  const display = s.length > 120 ? s.slice(0, 117).trimEnd() + '…' : s;
  return { key: display.toLowerCase(), display };
}

// Constant-time compare; never throws on length mismatch.
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

  // Body may arrive parsed or as a raw string depending on headers.
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

    const { data: chatbot, error: botErr } = await supabase
      .from('chatbots')
      .select('id, tenant_id, capture_messages')
      .eq('id', input.chatbot_id)
      .single();

    if (botErr || !chatbot) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    // Idempotency: a response already recorded is accepted silently so retries
    // / previous_response_id resends never double-count.
    if (input.openai_response_id) {
      const { data: existing } = await supabase
        .from('usage_events')
        .select('id')
        .eq('openai_response_id', input.openai_response_id)
        .maybeSingle();
      if (existing) {
        res.status(200).json({ ok: true, deduplicated: true });
        return;
      }
    }

    const promptTokens = input.prompt_tokens ?? input.input_tokens ?? 0;
    const completionTokens = input.completion_tokens ?? input.output_tokens ?? 0;
    const totalTokens = input.total_tokens ?? promptTokens + completionTokens;

    // Cost is computed here from the model — never trusted from the caller.
    const price = priceFor(input.model);
    const tokenCost = round6(
      (promptTokens / 1e6) * price.input + (completionTokens / 1e6) * price.output,
    );

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
    const conversationId =
      input.conversation_id?.trim() || input.openai_response_id || randomUUID();

    // Raw text stored only when the bot opted in (privacy-safe default off).
    const text = input.input_text ?? input.user_message;
    const storeText = chatbot.capture_messages && text ? text : null;

    const { error: insertErr } = await supabase.from('usage_events').insert({
      tenant_id: chatbot.tenant_id,
      chatbot_id: input.chatbot_id,
      conversation_id: conversationId,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      token_cost_usd: tokenCost,
      platform_cost_usd: platformCost,
      model: input.model,
      hour_of_day: hourOfDay,
      openai_response_id: input.openai_response_id ?? null,
      openai_prompt_id: input.openai_prompt_id ?? null,
      input_text: storeText,
    });

    if (insertErr) {
      if ((insertErr as { code?: string }).code === '23505') {
        res.status(200).json({ ok: true, deduplicated: true }); // concurrent duplicate
        return;
      }
      res.status(500).json({ error: 'Server error' });
      return;
    }

    // Best-effort: a failure here must not fail the already-inserted event.
    if (chatbot.capture_messages && text) {
      const q = normalizeQuestion(text);
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
