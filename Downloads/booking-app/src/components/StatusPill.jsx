const STYLES = {
  scheduled:   'bg-ink-100 text-ink-600',
  in_progress: 'bg-amber-soft text-amber-deep',
  completed:   'bg-moss-soft text-moss-deep',
  cancelled:   'bg-rose-100 text-rose-700',
}

const LABELS = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Done',
  cancelled: 'Cancelled',
}

export default function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status] ?? 'bg-ink-100 text-ink-600'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {LABELS[status] ?? status}
    </span>
  )
}
