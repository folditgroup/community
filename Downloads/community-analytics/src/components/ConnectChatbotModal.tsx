import { useMemo, useState, type FormEvent } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import type { ChatbotCardData, Provider } from '../types';
import { PROVIDERS, PROVIDER_MODELS, PROVIDER_KEY_HINT } from '../lib/dataset';
import { useSession } from '../lib/session';
import Toggle from './ui/Toggle';

const INPUT =
  'w-full rounded-md border border-border-input bg-surface px-3 py-2.5 text-13 text-ink placeholder:text-text-muted outline-none transition-colors focus:border-brand-green';
const LABEL = 'mb-1.5 block text-12 font-semibold text-text-label';

interface Props {
  /** When provided, the modal edits this chatbot instead of creating one. */
  bot?: ChatbotCardData | null;
  onClose: () => void;
}

/**
 * The connect-a-chatbot surface. Entering an API key here is what "connects" a
 * bot and unlocks its metrics across the app. The raw key is handed to the
 * store, which keeps only a masked copy — it is never persisted in the clear.
 */
export default function ConnectChatbotModal({ bot, onClose }: Props): JSX.Element {
  const { connectChatbot, updateChatbot } = useSession();
  const editing = !!bot;

  const [name, setName] = useState(bot?.name ?? '');
  const [provider, setProvider] = useState<Provider>(bot?.provider ?? 'OpenAI');
  const [model, setModel] = useState<string>(bot?.model ?? PROVIDER_MODELS.OpenAI[0]);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [budget, setBudget] = useState<string>(bot?.budget != null ? String(bot.budget) : '');
  const [captureMessages, setCaptureMessages] = useState<boolean>(bot?.captureMessages ?? false);
  const [error, setError] = useState<string | null>(null);

  const models = useMemo(() => PROVIDER_MODELS[provider], [provider]);
  const hint = PROVIDER_KEY_HINT[provider];

  function onProviderChange(next: Provider): void {
    setProvider(next);
    // keep the current model if the new provider still offers it, else default
    const list = PROVIDER_MODELS[next];
    setModel((m) => (list.includes(m) ? m : list[0]));
  }

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Give your chatbot a name.');
      return;
    }
    const key = apiKey.trim();
    if (!editing && !key) {
      setError('Enter an API key to connect this chatbot.');
      return;
    }
    if (key && hint.prefix && !key.startsWith(hint.prefix)) {
      setError(`That doesn't look like a ${provider} key — it should start with "${hint.prefix}".`);
      return;
    }

    const budgetTrimmed = budget.trim();
    let budgetValue: number | undefined;
    if (budgetTrimmed) {
      const n = Number(budgetTrimmed);
      if (!Number.isFinite(n) || n <= 0) {
        setError('Monthly budget must be a positive number.');
        return;
      }
      budgetValue = n;
    }

    if (editing && bot) {
      updateChatbot(bot.id, {
        name: name.trim(),
        provider,
        model,
        apiKey: key || undefined,
        captureMessages,
        budget: budgetValue ?? null,
      });
    } else {
      connectChatbot({
        name: name.trim(),
        provider,
        model,
        apiKey: key,
        captureMessages,
        budget: budgetValue,
      });
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-xl border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-17 font-bold text-ink">
              {editing ? 'Edit chatbot' : 'Connect a chatbot'}
            </h2>
            <p className="mt-1 text-12.5 text-text-muted">
              {editing
                ? 'Update the provider, model, or rotate the API key.'
                : 'Add your provider API key to start pulling metrics.'}
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

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          <div>
            <label className={LABEL} htmlFor="cb-name">
              Chatbot name
            </label>
            <input
              id="cb-name"
              className={INPUT}
              placeholder="e.g. Support Assistant"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="cb-provider">
                Provider
              </label>
              <select
                id="cb-provider"
                className={INPUT}
                value={provider}
                onChange={(e) => onProviderChange(e.target.value as Provider)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="cb-model">
                Model
              </label>
              <select
                id="cb-model"
                className={INPUT}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="cb-key">
              API key{' '}
              {editing && (
                <span className="font-normal text-text-muted">(leave blank to keep current)</span>
              )}
            </label>
            <div className="relative">
              <input
                id="cb-key"
                type={showKey ? 'text' : 'password'}
                className={`${INPUT} pr-10 font-mono`}
                placeholder={editing && bot ? bot.keyMasked : hint.example}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-text-muted hover:text-text-secondary"
                aria-label={showKey ? 'Hide key' : 'Show key'}
                tabIndex={-1}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1.5 text-11.5 text-text-muted">
              Stored masked on this device. Your real key stays private and is never shown again.
            </p>
          </div>

          <div>
            <label className={LABEL} htmlFor="cb-budget">
              Monthly budget <span className="font-normal text-text-muted">(optional, USD)</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-13 text-text-muted">
                $
              </span>
              <input
                id="cb-budget"
                type="number"
                min={0}
                step={10}
                className={`${INPUT} pl-7`}
                placeholder="e.g. 250"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <p className="mt-1.5 text-11.5 text-text-muted">
              A dedicated spend cap for this bot. Leave blank to roll up to the workspace budget.
            </p>
          </div>

          <div className="rounded-md border border-border-input bg-surface-alt px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-12.5 font-semibold text-ink">Capture top questions</div>
                <p className="mt-0.5 text-11.5 text-text-muted">
                  Record what users ask most. Only normalized questions are kept — never raw
                  transcripts.
                </p>
              </div>
              <Toggle
                on={captureMessages}
                onChange={() => setCaptureMessages((v) => !v)}
                label="Capture top questions"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-bg px-3 py-2 text-12.5 font-medium text-red">
              {error}
            </div>
          )}

          <div className="mt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-input px-4 py-2.5 text-13 font-semibold text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-ink px-4 py-2.5 text-13 font-semibold text-white"
            >
              {editing ? 'Save changes' : 'Connect chatbot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
