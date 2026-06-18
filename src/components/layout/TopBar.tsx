import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAppState } from '../../lib/appState';
import { useSession } from '../../lib/session';
import { cx } from '../../lib/cx';
import type { ChatbotFilter, Period } from '../../types';

interface TopBarProps {
  title: string;
  /** Show the chatbot selector + date pills (Dashboard & Usage only). */
  showControls: boolean;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'custom', label: 'Custom' },
];

export default function TopBar({ title, showControls }: TopBarProps): JSX.Element {
  const { chatbot, setChatbot, period, setPeriod } = useAppState();
  const { dataset } = useSession();

  // Options are derived from the tenant's connected chatbots.
  const chatbotOptions = useMemo<{ value: ChatbotFilter; label: string }[]>(
    () => [
      { value: 'all', label: 'All Chatbots' },
      ...(dataset?.bots ?? []).map((b) => ({ value: b.key, label: b.name })),
    ],
    [dataset],
  );

  // Guard against a stale selection (e.g. just after disconnecting a bot).
  const selected = chatbotOptions.some((o) => o.value === chatbot) ? chatbot : 'all';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-5 border-b border-border bg-surface px-7">
      <h1 className="m-0 text-18 font-semibold tracking-[-0.01em] text-ink">{title}</h1>

      {showControls && (
        <div className="flex items-center gap-[14px]">
          <div className="relative">
            <select
              value={selected}
              onChange={(e) => setChatbot(e.target.value as ChatbotFilter)}
              className="cursor-pointer appearance-none rounded-md border border-border-input bg-surface py-2 pl-3 pr-8 text-13 font-medium text-ink outline-none"
            >
              {chatbotOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              strokeWidth={2}
              className="pointer-events-none absolute right-[11px] top-1/2 -translate-y-1/2 text-text-label"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {PERIOD_OPTIONS.map((p) => {
              const active = period === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  className={cx(
                    'rounded-md border px-[13px] py-[7px] text-12.5 font-semibold transition-colors',
                    active
                      ? 'border-ink bg-ink text-white'
                      : 'border-border-input bg-surface text-text-primary hover:bg-surface-hover',
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
