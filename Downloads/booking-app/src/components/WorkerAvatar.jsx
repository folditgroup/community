import { initials } from '../lib/format.js'

export default function WorkerAvatar({ worker, size = 28 }) {
  if (!worker) return null
  return (
    <div
      title={worker.name}
      className="grid place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: worker.color || '#3F3F37', fontSize: size * 0.38 }}
    >
      {initials(worker.name)}
    </div>
  )
}

export function WorkerStack({ workers, size = 26 }) {
  return (
    <div className="flex -space-x-2">
      {workers.map((w) => (
        <div key={w.id} className="ring-2 ring-white rounded-full">
          <WorkerAvatar worker={w} size={size} />
        </div>
      ))}
    </div>
  )
}
