import Card from './Card';
import TrendBadge from './TrendBadge';

interface StatCardProps {
  label: string;
  value: string;
  trendPct: number;
}

/** KPI card: label → big value → "vs previous period" + TrendBadge. */
export default function StatCard({ label, value, trendPct }: StatCardProps): JSX.Element {
  return (
    <Card className="flex flex-col gap-3 px-[18px] pb-4 pt-[18px]">
      <div className="text-12.5 font-medium text-text-label">{label}</div>
      <div className="text-28 font-bold leading-none tracking-[-0.02em] text-ink">
        {value}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-11.5 text-text-muted">vs previous period</span>
        <TrendBadge pct={trendPct} />
      </div>
    </Card>
  );
}
