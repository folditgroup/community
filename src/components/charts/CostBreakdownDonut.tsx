import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../lib/utils';

interface CostBreakdownDonutProps {
  token: number;
  plat: number;
  total: number;
}

interface Segment {
  name: string;
  value: number;
  color: string;
  swatch: string;
}

export default function CostBreakdownDonut({
  token,
  plat,
  total,
}: CostBreakdownDonutProps): JSX.Element {
  const data: Segment[] = [
    { name: 'Token Cost', value: token, color: '#00C48C', swatch: 'bg-brand-green' },
    { name: 'Platform Cost', value: plat, color: '#0A0A0A', swatch: 'bg-ink' },
  ];

  return (
    <div className="mt-2 flex items-center gap-4">
      <div className="relative shrink-0 h-[150px] w-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              outerRadius={74}
              innerRadius={52}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-11 text-text-muted">Total</span>
          <span className="text-[21px] font-bold text-ink leading-tight">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-[11px] text-12.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-[9px]">
            <span className={`h-[10px] w-[10px] rounded-[3px] ${d.swatch}`} />
            <span className="text-text-secondary flex-1">{d.name}</span>
            <span className="text-ink font-semibold">{formatCurrency(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
