import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  /** CTA label; defaults to routing to the connect surface. */
  actionLabel?: string;
}

/**
 * Shown on data pages when the current tenant has no chatbots connected yet.
 * Always points back to "/chatbots", the surface where metrics get unlocked.
 */
export default function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel = 'Connect a chatbot',
}: EmptyStateProps): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover">
        <Icon size={24} strokeWidth={1.7} className="text-ink" />
      </span>
      <span className="mt-1 text-15 font-semibold text-ink">{title}</span>
      <span className="max-w-[360px] text-12.5 text-text-muted">{body}</span>
      <button
        type="button"
        onClick={() => navigate('/chatbots')}
        className="mt-2 inline-flex items-center gap-[7px] rounded-md bg-ink px-[15px] py-[9px] text-13 font-semibold text-white"
      >
        <Plus size={14} strokeWidth={2.2} />
        {actionLabel}
      </button>
    </div>
  );
}
