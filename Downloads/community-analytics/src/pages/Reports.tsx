import { Clock, Download, FileText, Plus } from 'lucide-react';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { useSession } from '../lib/session';
import { cx } from '../lib/cx';

/** Reports page — scheduled-report banner + a table of generated reports. */
export default function Reports(): JSX.Element {
  const { dataset } = useSession();
  const reports = dataset?.reports ?? [];
  const reportEmail = dataset?.reportEmail ?? '';

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No reports yet"
        body="Once a chatbot is connected, monthly cost summaries and exportable reports are generated here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {/* (1) Scheduled banner */}
      <Card className="flex items-center justify-between gap-4 px-5 py-[18px]">
        <div className="flex items-center gap-[14px]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-brand-green-bg">
            <Clock size={19} strokeWidth={1.8} className="text-brand-green-text" />
          </div>
          <div>
            <div className="text-13.5 font-semibold text-ink">Monthly Cost Summary</div>
            <div className="mt-0.5 text-12 text-text-muted">
              Auto-sent on the 1st of each month to {reportEmail}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-bg px-[11px] py-[5px] text-12 font-semibold text-brand-green-text">
          <span className="h-[7px] w-[7px] rounded-full bg-brand-green" />
          Scheduled
        </span>
      </Card>

      {/* (2) Generated Reports */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-[18px] pb-3 pt-4">
          <span className="text-14 font-semibold text-ink">Generated Reports</span>
          <button
            type="button"
            className="inline-flex items-center gap-[7px] rounded-md bg-ink px-[14px] py-2 text-12.5 font-semibold text-white"
          >
            <Plus size={13} strokeWidth={2.2} />
            Generate Report
          </button>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b border-border px-[18px] py-2.5 text-11 font-semibold uppercase tracking-[0.04em] text-text-muted text-left">
                Report
              </th>
              <th className="border-b border-border px-[18px] py-2.5 text-11 font-semibold uppercase tracking-[0.04em] text-text-muted text-left">
                Period
              </th>
              <th className="border-b border-border px-[18px] py-2.5 text-11 font-semibold uppercase tracking-[0.04em] text-text-muted text-left">
                Generated
              </th>
              <th className="border-b border-border px-[18px] py-2.5 text-11 font-semibold uppercase tracking-[0.04em] text-text-muted text-right">
                Total Cost
              </th>
              <th className="border-b border-border px-[18px] py-2.5 text-11 font-semibold uppercase tracking-[0.04em] text-text-muted text-right" />
            </tr>
          </thead>
          <tbody>
            {reports.map((report, i) => (
              <tr
                key={i}
                className={cx(
                  'transition-colors hover:bg-surface-hover',
                  i % 2 === 0 ? '' : 'bg-surface-alt',
                )}
              >
                <td className="border-b border-border-inner px-[18px] py-[13px] text-13 text-left font-semibold text-ink">
                  {report.name}
                </td>
                <td className="border-b border-border-inner px-[18px] py-[13px] text-13 text-left text-text-primary">
                  {report.period}
                </td>
                <td className="border-b border-border-inner px-[18px] py-[13px] text-13 text-left text-text-muted">
                  {report.date}
                </td>
                <td className="border-b border-border-inner px-[18px] py-[13px] text-13 text-right font-semibold text-ink">
                  {report.cost}
                </td>
                <td className="border-b border-border-inner px-[18px] py-[13px] text-13 text-right">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border-input bg-surface px-[11px] py-1.5 text-12 font-semibold text-text-primary transition-colors hover:border-ink hover:text-ink"
                  >
                    <Download size={13} />
                    CSV
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
