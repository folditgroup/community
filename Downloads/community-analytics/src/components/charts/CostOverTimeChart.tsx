import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { axisTicks, formatCurrency, pickXTicks } from '../../lib/utils';
import type { SeriesPoint } from '../../types';

interface CostOverTimeChartProps {
  points: SeriesPoint[];
}

interface TooltipPayloadEntry {
  dataKey?: string | number;
  value?: number;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadEntry[];
}

const SERIES: ReadonlyArray<{ dataKey: string; label: string; color: string }> = [
  { dataKey: 'token', label: 'Token', color: '#00C48C' },
  { dataKey: 'platform', label: 'Platform', color: '#0A0A0A' },
];

function ChartTooltip({ active, label, payload }: ChartTooltipProps): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;

  const valueFor = (key: string): number => {
    const entry = payload.find((p) => p.dataKey === key);
    return typeof entry?.value === 'number' ? entry.value : 0;
  };

  return (
    <div className="rounded-[7px] border border-border-input bg-surface px-[11px] py-2 text-11.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="mb-[5px] font-semibold text-ink">{label}</div>
      {SERIES.map((s) => (
        <div
          key={s.dataKey}
          className="flex items-center gap-1.5 text-text-secondary"
        >
          <span
            className="h-2 w-2 rounded-[2px]"
            style={{ backgroundColor: s.color }}
          />
          <span>{s.label}</span>
          <span className="ml-1 font-bold text-ink">
            {formatCurrency(valueFor(s.dataKey))}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CostOverTimeChart({ points }: CostOverTimeChartProps): JSX.Element {
  const maxY = Math.max(...points.map((p) => p.token), 0.001) * 1.22;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={points} margin={{ top: 16, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid vertical={false} stroke="#F0F0F0" />
        <XAxis
          dataKey="date"
          ticks={pickXTicks(points.map((p) => p.date))}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickLine={false}
          axisLine={false}
          dy={6}
        />
        <YAxis
          domain={[0, maxY]}
          ticks={axisTicks(maxY)}
          tickFormatter={formatCurrency}
          width={50}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{
            stroke: '#0A0A0A',
            strokeWidth: 1,
            strokeDasharray: '3 3',
            opacity: 0.4,
          }}
          content={<ChartTooltip />}
        />
        <Area
          dataKey="token"
          type="linear"
          fill="#00C48C"
          fillOpacity={0.6}
          stroke="#00C48C"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#00C48C', stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={false}
        />
        <Area
          dataKey="platform"
          type="linear"
          fill="#0A0A0A"
          fillOpacity={0.32}
          stroke="none"
          dot={false}
          activeDot={{ r: 4, fill: '#0A0A0A', stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
