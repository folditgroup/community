import { cx } from '../../lib/cx';
import { formatSign } from '../../lib/utils';

interface TrendBadgeProps {
  /** percentage change; >= 0 renders a green up-triangle, < 0 a red down-triangle */
  pct: number;
}

/**
 * Small pill showing a trend percentage with a tiny triangle.
 * Positive: brand-green-text on brand-green-bg. Negative: red on red-bg.
 */
export default function TrendBadge({ pct }: TrendBadgeProps): JSX.Element {
  const up = pct >= 0;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-[5px] px-2 py-[3px] text-12 font-semibold',
        up ? 'bg-brand-green-bg text-brand-green-text' : 'bg-red-bg text-red',
      )}
    >
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
        <polygon
          points={up ? '5,1 9,9 1,9' : '1,1 9,1 5,9'}
          fill="currentColor"
        />
      </svg>
      {formatSign(pct)}
    </span>
  );
}
