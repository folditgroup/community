import { BarChart3 } from 'lucide-react';
import { useAnalytics } from '../lib/session';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import CostOverTimeChart from '../components/charts/CostOverTimeChart';
import DailyConversationsChart from '../components/charts/DailyConversationsChart';
import CostBreakdownDonut from '../components/charts/CostBreakdownDonut';

/** Analytics dashboard — route "/". */
export default function Dashboard(): JSX.Element {
  const d = useAnalytics();

  if (d.botCount === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No analytics yet"
        body="Connect a chatbot and its active users, conversations, and cost will show up here automatically."
      />
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {/* (a) Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {d.cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} trendPct={c.trendPct} />
        ))}
      </div>

      {/* (b) Cost Over Time */}
      <Card className="px-5 pb-[14px] pt-5">
        <div className="mb-1.5 flex items-start justify-between">
          <div>
            <div className="text-14 font-semibold text-ink">Cost Over Time</div>
            <div className="mt-0.5 text-12 text-text-muted">
              {'Token cost vs. platform usage · ' + d.rangeLabel}
            </div>
          </div>
          <div className="flex items-center gap-4 text-12 text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[11px] w-[11px] rounded-[3px] bg-brand-green" />
              Token Cost
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[11px] w-[11px] rounded-[3px] bg-ink" />
              Platform Cost
            </span>
          </div>
        </div>
        <CostOverTimeChart points={d.series.points} />
      </Card>

      {/* (c) Two-column: Daily Conversations + Cost Breakdown */}
      <div className="grid grid-cols-2 gap-[18px]">
        <Card className="px-5 pb-[14px] pt-5">
          <div className="mb-2.5 flex items-start justify-between gap-3">
            <div>
              <div className="text-14 font-semibold text-ink">Daily Conversations</div>
              <div className="mt-0.5 text-12 text-text-muted">{d.rangeLabel}</div>
            </div>
            <div className="text-right">
              <div className="text-19 font-bold leading-none text-ink">{d.usersValue}</div>
              <div className="mt-1 text-11 text-text-muted">
                {'active users · ' + d.msgPerChat + ' msgs / chat'}
              </div>
            </div>
          </div>
          <DailyConversationsChart points={d.series.points} />
        </Card>

        <Card className="p-5">
          <div className="mb-0.5 text-14 font-semibold text-ink">Cost Breakdown</div>
          <div className="mb-1.5 text-12 text-text-muted">{d.rangeLabel}</div>
          <CostBreakdownDonut token={d.donut.token} plat={d.donut.plat} total={d.donut.total} />
        </Card>
      </div>

      {/* (d) Most Frequent Messages */}
      <Card className="px-[22px] pb-[22px] pt-5">
        <div className="mb-0.5 text-14 font-semibold text-ink">Most Frequent Messages</div>
        <div className="mb-[18px] text-12 text-text-muted">
          {'What people ask ' + d.botLabel + ' most · ' + d.rangeLabel}
        </div>
        <div className="flex flex-col gap-[14px]">
          {d.topMessages.map((m) => (
            <div key={m.rank} className="flex items-center gap-[14px]">
              <div className="w-4 shrink-0 text-center text-12 font-bold text-text-rank">
                {m.rank}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-[7px] flex items-baseline justify-between gap-[14px]">
                  <span className="text-13 font-medium text-ink">{m.label}</span>
                  <span className="shrink-0 whitespace-nowrap text-12 text-text-muted">
                    <span className="font-semibold text-text-primary">{m.count}</span>
                    {' · ' + m.share}
                  </span>
                </div>
                <div className="h-[7px] overflow-hidden rounded bg-surface-hover">
                  <div
                    className="h-full rounded bg-brand-green"
                    style={{ width: m.barPct + '%' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* (e) Chatbot Breakdown */}
      <Card className="overflow-hidden border-t-2 border-t-brand-green">
        <div className="px-[18px] pb-3 pt-4 text-14 font-semibold text-ink">Chatbot Breakdown</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr>
                <th className="border-b border-border px-[18px] py-2.5 text-left text-11 font-semibold uppercase tracking-[0.04em] text-text-muted">
                  Chatbot
                </th>
                <th className="border-b border-border px-[18px] py-2.5 text-right text-11 font-semibold uppercase tracking-[0.04em] text-text-muted">
                  Active Users
                </th>
                <th className="border-b border-border px-[18px] py-2.5 text-right text-11 font-semibold uppercase tracking-[0.04em] text-text-muted">
                  Avg Msgs / Chat
                </th>
                <th className="border-b border-border px-[18px] py-2.5 text-right text-11 font-semibold uppercase tracking-[0.04em] text-text-muted">
                  Token Cost
                </th>
                <th className="border-b border-border px-[18px] py-2.5 text-right text-11 font-semibold uppercase tracking-[0.04em] text-text-muted">
                  Platform Cost
                </th>
                <th className="border-b border-border px-[18px] py-2.5 text-right text-11 font-semibold uppercase tracking-[0.04em] text-text-muted">
                  Total Cost
                </th>
                <th className="border-b border-border px-[18px] py-2.5 text-right text-11 font-semibold uppercase tracking-[0.04em] text-text-muted">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r, i) => (
                <tr
                  key={r.name}
                  className={
                    (i % 2 === 0 ? '' : 'bg-surface-alt') + ' transition-colors hover:bg-surface-hover'
                  }
                >
                  <td className="border-b border-border-inner px-[18px] py-[13px] text-left text-13 font-semibold text-ink">
                    {r.name}
                  </td>
                  <td className="border-b border-border-inner px-[18px] py-[13px] text-right text-13 text-text-primary">
                    {r.users}
                  </td>
                  <td className="border-b border-border-inner px-[18px] py-[13px] text-right text-13 text-text-primary">
                    {r.avgMsgs}
                  </td>
                  <td className="border-b border-border-inner px-[18px] py-[13px] text-right text-13 text-text-primary">
                    {r.token}
                  </td>
                  <td className="border-b border-border-inner px-[18px] py-[13px] text-right text-13 text-text-primary">
                    {r.plat}
                  </td>
                  <td className="border-b border-border-inner px-[18px] py-[13px] text-right text-13 font-semibold text-ink">
                    {r.total}
                  </td>
                  <td className="border-b border-border-inner px-[18px] py-[13px] text-right text-13">
                    <span className="inline-flex items-center justify-end gap-1 text-12.5 font-semibold text-brand-green-text">
                      <svg width="9" height="9" viewBox="0 0 10 10">
                        <polygon points="5,1 9,9 1,9" fill="#00A878" />
                      </svg>
                      {r.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
