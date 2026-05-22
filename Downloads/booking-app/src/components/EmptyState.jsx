export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {Icon && (
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-100 text-ink-500">
          <Icon size={22} strokeWidth={1.5} />
        </div>
      )}
      <div className="font-display text-2xl text-ink-800">{title}</div>
      {description && <p className="max-w-md text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
