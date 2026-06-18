import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { useSession } from '../lib/session';
import { fetchCost, type CostSummary } from '../lib/supabaseBackend';
import Card from '../components/ui/Card';

const INPUT =
  'w-full rounded-md border border-border-input bg-surface px-3 py-2 text-13 text-ink placeholder:text-text-muted outline-none transition-colors focus:border-brand-green';
const SELECT =
  'rounded-md border border-border-input bg-surface px-2.5 py-2 text-13 font-semibold text-ink outline-none transition-colors focus:border-brand-green';

const PERIODS: Array<{ value: string; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

function usd(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}
function int(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Admin-only "cost for a specific client over a period" view — the internal
 * lookup Community asked for. Calls GET /api/analytics/cost; an admin JWT may
 * query any client_id. Only mounted/linked when the session is an admin.
 */
export default function CostExplorer(): JSX.Element {
  const { tenant } = useSession();
  const [clientId, setClientId] = useState(tenant?.id ?? '');
  const [period, setPeriod] = useState('30d');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CostSummary | null>(null);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const data = await fetchCost({ clientId: clientId.trim() || undefined, period });
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-[860px] flex-col gap-[18px]">
      <p className="text-13 text-text-muted">
        Total token + platform cost for a specific client over a period, broken down by model.
      </p>

      <Card className="p-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-12 font-semibold text-text-label" htmlFor="client">
              Client ID
            </label>
            <input
              id="client"
              className={INPUT + ' font-mono'}
              placeholder="00000000-0000-0000-0000-000000000000"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              autoCapitalize="none"
              spellCheck={false}
            />
            <p className="mt-1 text-11.5 text-text-muted">
              Leave as your own workspace, or enter any client's UUID.
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1.5 block text-12 font-semibold text-text-label" htmlFor="period">
                Period
              </label>
              <select
                id="period"
                className={SELECT}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-13 font-semibold text-white disabled:opacity-60"
            >
              <Search size={15} />
              {busy ? 'Looking up…' : 'Look up'}
            </button>
          </div>
        </form>
      </Card>

      {error && (
        <Card className="border-rose-200 bg-rose-50 p-4">
          <p className="text-13 text-rose-700">{error}</p>
        </Card>
      )}

      {result && (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-12 font-semibold uppercase tracking-wide text-text-muted">
                Total cost
              </span>
              <span className="font-mono text-11.5 text-text-muted">{result.client_id}</span>
            </div>
            <div className="mt-1 text-28 font-bold tracking-[-0.02em] text-ink">
              {usd(result.total_cost_usd)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {[
                ['Token cost', usd(result.token_cost_usd)],
                ['Platform cost', usd(result.platform_cost_usd)],
                ['Events', int(result.event_count)],
                ['Tokens', int(result.total_tokens)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-11.5 text-text-muted">{label}</div>
                  <div className="text-15 font-semibold text-ink">{value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border-inner px-5 py-3 text-13 font-bold text-ink">
              By model
            </div>
            {result.by_model.length === 0 ? (
              <div className="px-5 py-8 text-center text-13 text-text-muted">
                No usage in this period.
              </div>
            ) : (
              <table className="w-full text-13">
                <thead>
                  <tr className="border-b border-border-inner text-left text-11.5 text-text-muted">
                    <th className="px-5 py-2 font-medium">Model</th>
                    <th className="px-5 py-2 text-right font-medium">Events</th>
                    <th className="px-5 py-2 text-right font-medium">Tokens</th>
                    <th className="px-5 py-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {result.by_model.map((m) => (
                    <tr key={m.model} className="border-b border-border-inner last:border-0">
                      <td className="px-5 py-2.5 font-medium text-ink">{m.model}</td>
                      <td className="px-5 py-2.5 text-right text-text-secondary">{int(m.events)}</td>
                      <td className="px-5 py-2.5 text-right text-text-secondary">
                        {int(m.total_tokens)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-semibold text-ink">
                        {usd(m.total_cost_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
