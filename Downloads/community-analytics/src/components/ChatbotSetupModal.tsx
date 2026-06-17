import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import type { ChatbotCardData } from '../types';
import { ingestUrlAbsolute } from '../lib/config';

interface Props {
  bot: ChatbotCardData;
  onClose: () => void;
}

/**
 * Shows everything a customer needs to start sending this bot's traffic to the
 * platform: the bot's ID, the ingest endpoint, and a ready-to-paste snippet.
 * Data is "push" — the bot reports each reply; we don't pull from the provider.
 */
export default function ChatbotSetupModal({ bot, onClose }: Props): JSX.Element {
  const endpoint = ingestUrlAbsolute();
  const [copied, setCopied] = useState<string | null>(null);

  function copy(id: string, text: string): void {
    void navigator.clipboard?.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
  }

  const snippet = `// After your bot replies, report the usage to Community Analytics.
// Fire-and-forget so it never blocks the user.
await fetch("${endpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chatbot_id: "${bot.id}",
    conversation_id: conversationId,          // your dialog/session id
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
    model: "${bot.model}",
    message_count: 1,
    user_message: userMessage,                // optional — only stored if capture is on
    webhook_secret: process.env.COMMUNITY_WEBHOOK_SECRET,
  }),
}).catch(() => {});`;

  function CopyBtn({ id, text }: { id: string; text: string }): JSX.Element {
    const done = copied === id;
    return (
      <button
        type="button"
        onClick={() => copy(id, text)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-input bg-surface px-2.5 py-1.5 text-12 font-semibold text-text-secondary transition-colors hover:border-ink hover:text-ink"
      >
        {done ? <Check size={13} className="text-brand-green-text" /> : <Copy size={13} />}
        {done ? 'Copied' : 'Copy'}
      </button>
    );
  }

  function Field({ id, label, value }: { id: string; label: string; value: string }): JSX.Element {
    return (
      <div>
        <div className="mb-1.5 text-12 font-semibold text-text-label">{label}</div>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md bg-surface-alt px-3 py-2 font-mono text-12 text-ink">
            {value}
          </code>
          <CopyBtn id={id} text={value} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-17 font-bold text-ink">Send data from “{bot.name}”</h2>
            <p className="mt-1 text-12.5 text-text-muted">
              Your bot reports each reply to this endpoint, and the metrics show up here. The
              provider API key alone does not expose analytics — the data is pushed by your bot.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-secondary"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <Field id="id" label="Chatbot ID" value={bot.id} />
          <Field id="endpoint" label="Ingest endpoint" value={endpoint} />

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-12 font-semibold text-text-label">Drop-in snippet</span>
              <CopyBtn id="snippet" text={snippet} />
            </div>
            <pre className="overflow-x-auto rounded-md bg-ink px-3.5 py-3 text-11.5 leading-relaxed text-white">
              <code>{snippet}</code>
            </pre>
          </div>

          <div className="rounded-md bg-surface-alt px-3.5 py-3 text-11.5 leading-relaxed text-text-secondary">
            <span className="font-semibold text-ink">Notes.</span> Authenticate with the shared{' '}
            <code className="font-mono">WEBHOOK_SECRET</code> from your deployment env. Token cost is
            computed server-side from the model. To populate “Most Frequent Messages”, enable{' '}
            <span className="font-semibold">Capture top questions</span> on this bot and include{' '}
            <code className="font-mono">user_message</code> — only normalized questions are stored,
            never raw transcripts.
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-ink px-4 py-2.5 text-13 font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
