import { useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface BusiestHoursChartProps {
  hourly: number[];
  peak: number;
}

const HOUR_LABELS: Record<number, string> = {
  0: '12a',
  6: '6a',
  12: '12p',
  18: '6p',
  23: '11p',
};

/** 0 -> "12 AM", 13 -> "1 PM", 19 -> "7 PM". */
function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

interface HourDatum {
  hour: number;
  v: number;
  pct: number;
}

interface HoursTooltipProps {
  active?: boolean;
  payload?: { payload: HourDatum }[];
}

function HoursTooltip({ active, payload }: HoursTooltipProps): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md bg-ink px-[9px] py-1.5 text-11.5 font-medium text-white">
      <div className="mb-0.5 text-[10.5px] text-text-muted">{formatHour(d.hour)}</div>
      {d.pct + '% of peak volume'}
    </div>
  );
}

export default function BusiestHoursChart({ hourly, peak }: BusiestHoursChartProps): JSX.Element {
  const [selected, setSelected] = useState<number | null>(null);

  const max = Math.max(...hourly, 0.0001);
  const data: HourDatum[] = hourly.map((v, i) => ({
    hour: i,
    v,
    pct: Math.round((v / max) * 100),
  }));

  // Exactly one bar is green at a time: the user's selection if any, else the peak.
  const highlight = selected ?? peak;
  const readout =
    selected !== null
      ? `${formatHour(selected)} · ${data[selected].pct}% of peak`
      : `Peak · ${formatHour(peak)}`;

  function toggle(index: number): void {
    setSelected((cur) => (cur === index ? null : index));
  }

  return (
    <div className="flex flex-col">
      <div className="mb-1 flex justify-end">
        <span className="text-11 font-medium text-text-muted">{readout}</span>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart
          data={data}
          margin={{ top: 14, right: 10, bottom: 4, left: 6 }}
          barCategoryGap="40%"
          onClick={(state) => {
            const idx = state?.activeTooltipIndex;
            if (typeof idx === 'number') toggle(idx);
          }}
        >
          <YAxis hide domain={[0, 1]} />
          <XAxis
            dataKey="hour"
            ticks={[0, 6, 12, 18, 23]}
            interval={0}
            tickFormatter={(value: number) => HOUR_LABELS[value] ?? ''}
            tick={{ fontSize: 10.5, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: 'transparent' }} content={<HoursTooltip />} />
          <Bar
            dataKey="v"
            radius={[1.5, 1.5, 0, 0]}
            isAnimationActive={false}
            cursor="pointer"
            activeBar={{ fill: '#00C48C' }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={i === highlight ? '#00C48C' : '#0A0A0A'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
