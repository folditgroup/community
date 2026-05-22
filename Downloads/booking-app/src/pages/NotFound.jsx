import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-6 text-center">
      <div>
        <div className="font-display text-7xl text-ink-800">404</div>
        <p className="mt-2 text-ink-500">That page wandered off the route sheet.</p>
        <Link to="/" className="btn-accent mt-6">Go home</Link>
      </div>
    </div>
  )
}
