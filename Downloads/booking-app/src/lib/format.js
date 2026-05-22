import { format, isToday, isTomorrow, parseISO } from 'date-fns'

export const fmtDate = (iso) => {
  const d = typeof iso === 'string' ? parseISO(iso) : iso
  return format(d, 'EEE, MMM d')
}

export const fmtTime = (iso) => {
  const d = typeof iso === 'string' ? parseISO(iso) : iso
  return format(d, 'h:mm a')
}

export const fmtDateTime = (iso) => `${fmtDate(iso)} · ${fmtTime(iso)}`

export const fmtDayLabel = (iso) => {
  const d = typeof iso === 'string' ? parseISO(iso) : iso
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEEE, MMMM d')
}

export const fmtMoney = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')
