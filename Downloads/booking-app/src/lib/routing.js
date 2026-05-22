// Lightweight client-side route helpers. Real production routing would use
// a Google Maps Distance Matrix call — these heuristics keep the demo
// functional without external services.

import { parseISO } from 'date-fns'

// Greedy nearest-neighbor over an address proxy (string distance) — good
// enough for visual sorting in the demo. Returns the bookings sorted into
// a sensible driving order for the day.
export function suggestRoute(bookings) {
  if (bookings.length <= 1) return bookings
  const sorted = [...bookings].sort((a, b) => parseISO(a.start) - parseISO(b.start))
  const ordered = [sorted[0]]
  const remaining = sorted.slice(1)
  while (remaining.length) {
    const last = ordered[ordered.length - 1]
    let bestIdx = 0
    let bestScore = Infinity
    remaining.forEach((b, i) => {
      const score = stringDist(last.address || '', b.address || '')
      if (score < bestScore) {
        bestScore = score
        bestIdx = i
      }
    })
    ordered.push(remaining.splice(bestIdx, 1)[0])
  }
  return ordered
}

function stringDist(a, b) {
  const la = a.toLowerCase()
  const lb = b.toLowerCase()
  let common = 0
  const tokens = new Set(la.split(/[\s,]+/))
  lb.split(/[\s,]+/).forEach((t) => { if (tokens.has(t)) common++ })
  return -common // negative because more shared tokens = "closer"
}

// Score how well a worker fits a service given existing assignments today.
export function scoreWorkerForBooking(worker, service, dayBookings) {
  let score = 0
  if (worker.skills?.some((s) => service?.name?.toLowerCase().includes(s.toLowerCase()))) score += 3
  score -= dayBookings.filter((b) => b.workerIds?.includes(worker.id)).length
  return score
}
