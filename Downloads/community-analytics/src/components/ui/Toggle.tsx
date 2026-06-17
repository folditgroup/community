import { cx } from '../../lib/cx';

interface ToggleProps {
  on: boolean;
  onChange: () => void;
  /** Accessible label describing what the toggle controls. */
  label?: string;
}

/**
 * 38×22 pill toggle. Track is brand-green when on, toggle-off grey when off;
 * the 16px white knob slides 16px to the right when on.
 */
export default function Toggle({ on, onChange, label }: ToggleProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cx(
        'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors',
        on ? 'bg-brand-green' : 'bg-toggle-off',
      )}
    >
      <span
        className={cx(
          'absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform',
          on ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}
