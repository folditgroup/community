import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schemas for all serverless input validation.
// ---------------------------------------------------------------------------

/** Body posted by Node-RED to POST /api/webhook/usage. */
export const usageWebhookSchema = z.object({
  chatbot_id: z.string().uuid(),
  conversation_id: z.string().min(1),
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  model: z.string().min(1),
  message_count: z.number().int().positive().default(1),
  /**
   * Optional end-user message text. Only used to populate "Most Frequent
   * Messages", and only when the chatbot has capture_messages enabled. It is
   * normalized and counted — the raw text is never stored.
   */
  user_message: z.string().trim().min(1).max(2000).optional(),
  webhook_secret: z.string().min(1),
});

export type UsageWebhookInput = z.infer<typeof usageWebhookSchema>;

/** Query params for the analytics GET endpoints. */
export const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'custom']).default('30d'),
  chatbot_id: z.string().uuid().optional(),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

/** Body for creating a chatbot (POST /api/chatbots). */
export const chatbotCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  provider: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(80),
  capture_messages: z.boolean().optional().default(false),
  monthly_budget_usd: z.number().positive().nullable().optional(),
});

/** Body for updating a chatbot (PATCH /api/chatbots/[id]). */
export const chatbotUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    provider: z.string().trim().min(1).max(40),
    model: z.string().trim().min(1).max(80),
    capture_messages: z.boolean(),
    monthly_budget_usd: z.number().positive().nullable(),
  })
  .partial();
