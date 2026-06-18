import { Gauge } from 'lucide-react';
import { useAnalytics } from '../lib/session';
import { cx } from '../lib/cx';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import TokenConsumptionChart from '../components/charts/TokenConsumptionChart';
import BusiestHoursChart from '../components/charts/BusiestHoursChart';

/** Usage page (route "/usage"): token consumption, per-model usage, busiest hours. */
export default function Usage(): JSX.Element {
  const d = useAnalytics();

  if (d.botCount === 0) {
    return (
      <EmptyState
        icon={Gauge}
        title="No usage to show"
        body="Token consumption, per-model breakdowns, and busiest hours appear once a chatbot is connected."
      />
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {/* (1) Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {d.usageCards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} trendPct={c.trendPct} />
        ))}
      </div>

      {/* (2) Token Consumption */}
      <Card className="px-5 pb-[14px] pt-5">
        <div className="mb-1.5 flex items-start justify-between">
          <div>
            <div className="text-14 font-semibold text-ink">Token Consumption</div>
            <div className="text-12 text-text-muted">
              {'Prompt vs. completion tokens · ' + d.rangeLabel}
            </div>
          </div>
          <div className="flex items-center gap-4 text-12 text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[11px] w-[11px] rounded-[2px] bg-brand-green" />
              Prompt
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[11px] w-[11px] rounded-[2px] bg-ink" />
              Completion
            </span>
          </div>
        </div>
        <TokenConsumptionChart points={d.series.points} />
      </Card>

      {/* (3) Usage by Model */}
      <Card className="overflow-hidden">
        <div className="px-[18px] pb-3 pt-4 text-14 font-semibold text-ink">Usage by Model</div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b border-border px-[18px] py-2.5 text-left text-11 font-semibold uppercase tracking-[0.04em] text-text-muted">
                Model
              </th>
              <th className="border-b border-border px-[18px] py-2.5 text-right text-11 font-semibold uppercase tracking-[0.04em] text-text-muted">
                Messages
              </th>
              <th className="border-b border-border px-[18px] py-2.5 text-right text-11 font-semibold uppercase tracking-[0.04em] text-text-muted">
                Tokens
              </th>
              <th className="border-b border-border px-[18px] py-2.5 text-right text-11 font-semibold uppercase tracking-[0.04em] text-text-muted">
                Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {d.modelRows.map((mr, i) => (
              <tr
                key={mr.model}
                className={cx(
                  'transition-colors hover:bg-surface-hover',
                  i % 2 === 0 ? '' : 'bg-surface-alt',
                )}
              >
                <td className="border-b border-border-inner px-[18px] py-[13px] text-left text-13 font-semibold text-ink">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={cx(
                        'h-[9px] w-[9px] rounded-[2px]',
                        mr.dot === 'green' ? 'bg-brand-green' : 'bg-ink',
                      )}
                    />
                    {mr.model}
                  </span>
                </td>
                <td className="border-b border-border-inner px-[18px] py-[13px] text-right text-13 text-text-primary">
                  {mr.msgs}
                </td>
                <td className="border-b border-border-inner px-[18px] py-[13px] text-right text-13 text-text-primary">
                  {mr.tokens}
                </td>
                <td className="border-b border-border-inner px-[18px] py-[13px] text-right text-13 font-semibold text-ink">
                  {mr.cost}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* (4) Busiest Hours */}
      <Card className="px-5 pb-[14px] pt-5">
        <div className="mb-0.5 text-14 font-semibold text-ink">Busiest Hours</div>
        <div className="mb-2 text-12 text-text-muted">
          Conversation volume by hour of day · local time
        </div>
        <BusiestHoursChart hourly={d.hourly} peak={d.hourlyPeak} />
      </Card>
    </div>
  );
}
