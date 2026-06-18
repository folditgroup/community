import { z } from 'zod';

const tokenInt = z.number().int().nonnegative();

export const usageWebhookSchema = z
  .object({
    chatbot_id: z.string().uuid(),
    conversation_id: z.string().min(1).optional(),
    // Accept both Chat Completions (prompt/completion) and Responses API
    // (input/output) token names; normalized in the handler.
    prompt_tokens: tokenInt.optional(),
    completion_tokens: tokenInt.optional(),
    input_tokens: tokenInt.optional(),
    output_tokens: tokenInt.optional(),
    total_tokens: tokenInt.optional(),
    model: z.string().min(1),
    message_count: z.number().int().positive().default(1),
    openai_response_id: z.string().min(1).max(128).optional(),
    openai_prompt_id: z.string().min(1).max(128).optional(),
    // input_text (Responses API) / user_message (alias): stored raw only when
    // the bot has capture_messages enabled.
    input_text: z.string().trim().min(1).max(8000).optional(),
    user_message: z.string().trim().min(1).max(8000).optional(),
    webhook_secret: z.string().min(1),
  })
  .refine(
    (d) =>
      (d.prompt_tokens ?? d.input_tokens ?? 0) +
        (d.completion_tokens ?? d.output_tokens ?? 0) >
        0 || (d.total_tokens ?? 0) > 0,
    { message: 'token counts required' },
  );

export const chatbotCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  provider: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(80),
  capture_messages: z.boolean().optional().default(false),
  monthly_budget_usd: z.number().positive().nullable().optional(),
});

export const chatbotUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    provider: z.string().trim().min(1).max(40),
    model: z.string().trim().min(1).max(80),
    capture_messages: z.boolean(),
    monthly_budget_usd: z.number().positive().nullable(),
  })
  .partial();
