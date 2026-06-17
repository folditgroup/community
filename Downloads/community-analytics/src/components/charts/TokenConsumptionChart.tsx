import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { cx } from '../../lib/cx';
import { axisTicks, formatCompact, pickXTicks } from '../../lib/utils';
import type { SeriesPoint } from '../../types';

interface TokenConsumptionChartProps {
  points: SeriesPoint[];
}

const GREEN = '#00C48C';
const BLACK = '#0A0A0A';
const AXIS = '#9CA3AF';
const GRID = '#F0F0F0';
const CHART_HEIGHT = 280;

interface TokenTooltipRowProps {
  swatch: string;
  label: string;
  value: number;
}

function TokenTooltipRow({ swatch, label, value }: TokenTooltipRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: swatch }}
        />
        <span className="text-12 text-text-label">{label}</span>
      </span>
      <span className="text-12 font-medium text-text-primary">
        {formatCompact(value)}
      </span>
    </div>
  );
}

function TokenTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;

  const datum = payload[0]?.payload as SeriesPoint | undefined;
  if (!datum) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-sm">
      <div className="mb-1.5 text-12 font-medium text-text-secondary">{label}</div>
      <div className="flex flex-col gap-1">
        <TokenTooltipRow swatch={GREEN} label="Prompt" value={datum.promptTok} />
        <TokenTooltipRow swatch={BLACK} label="Completion" value={datum.complTok} />
      </div>
    </div>
  );
}

export default function TokenConsumptionChart({
  points,
}: TokenConsumptionChartProps): JSX.Element {
  const maxY = Math.max(...points.map((p) => p.promptTok), 0.001) * 1.22;
  const xTicks = pickXTicks(points.map((p) => p.date));

  return (
    <div className={cx('w-full')}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="date"
            ticks={xTicks}
            tick={{ fill: AXIS, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatCompact}
            ticks={axisTicks(maxY)}
            domain={[0, maxY]}
            width={50}
            tick={{ fill: AXIS, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<TokenTooltip />}
            cursor={{ stroke: BLACK, strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.4 }}
          />
          <Area
            type="monotone"
            dataKey="promptTok"
            stroke={GREEN}
            strokeWidth={2}
            fill={GREEN}
            fillOpacity={0.6}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 3, fill: GREEN, stroke: '#FFFFFF', strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="complTok"
            stroke="none"
            fill={BLACK}
            fillOpacity={0.32}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 3, fill: BLACK, stroke: '#FFFFFF', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
