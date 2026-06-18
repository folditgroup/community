import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

interface CardProps {
  children: ReactNode;
  /** Extra classes (padding, top-border accent, overflow, etc). */
  className?: string;
}

/**
 * Base surface card: white background, 1px border, 8px radius. Padding and any
 * accent (e.g. the green top border on the Chatbot Breakdown) are supplied by
 * the caller via `className`.
 */
export default function Card({ children, className }: CardProps): JSX.Element {
  return (
    <div className={cx('rounded-lg border border-border bg-surface', className)}>
      {children}
    </div>
  );
}
