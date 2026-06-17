import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SeriesPoint } from '../../types';
import { axisTicks, formatNumber, pickXTicks } from '../../lib/utils';

interface DailyConversationsChartProps {
  points: SeriesPoint[];
}

interface TooltipPayloadItem {
  value: number;
  payload: SeriesPoint;
}

interface ConversationsTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function ConversationsTooltip({ active, payload }: ConversationsTooltipProps): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="rounded-md bg-ink px-[9px] py-1.5 text-11.5 font-medium text-white">
      <div className="mb-0.5 text-[10.5px] text-text-muted">{item.payload.date}</div>
      {formatNumber(item.value) + ' conversations'}
    </div>
  );
}

export default function DailyConversationsChart({
  points,
}: DailyConversationsChartProps): JSX.Element {
  const maxY = Math.max(...points.map((p) => p.conversations), 1) * 1.15;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={points}
        margin={{ top: 14, right: 8, bottom: 4, left: 6 }}
        barCategoryGap="38%"
      >
        <CartesianGrid vertical={false} stroke="#F0F0F0" />
        <XAxis
          dataKey="date"
          ticks={pickXTicks(points.map((p) => p.date))}
          tick={{ fontSize: 10.5, fill: '#9CA3AF' }}
          tickLine={false}
          axisLine={false}
          dy={6}
        />
        <YAxis
          domain={[0, maxY]}
          ticks={axisTicks(maxY)}
          tickFormatter={formatNumber}
          width={34}
          tick={{ fontSize: 10.5, fill: '#9CA3AF' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip cursor={{ fill: 'transparent' }} content={<ConversationsTooltip />} />
        <Bar
          dataKey="conversations"
          fill="#0A0A0A"
          radius={[1.5, 1.5, 0, 0]}
          isAnimationActive={false}
          activeBar={{ fill: '#00C48C' }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
