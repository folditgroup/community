// ============================================================
// Slot calculator
// ============================================================
// Дає список вільних слотів для бронювання на N днів вперед
// з урахуванням:
//   1. business hours (schedule per weekday)
//   2. existing bookings (вже зайняті слоти)
//   3. time_off (відпустка / свято)
//   4. service.duration_min (тривалість сервісу)
//   5. service.buffer_min (час між робот)
//   6. business.slot_minutes (granularity grid)
// ============================================================

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/**
 * Повертає `Array<{ start: Date, end: Date }>` всіх вільних слотів на найближчі `days` днів.
 *
 * @param business       { schedule, slot_minutes, ... }
 * @param service        { duration_min, buffer_min }
 * @param existing       Array<{ start_at: string, end_at: string }>  — busy intervals
 * @param timeOff        Array<{ start_at: string, end_at: string, worker_id: null|string }>
 * @param opts.days      кількість днів вперед (default 14)
 * @param opts.fromDate  початкова дата (default зараз)
 * @param opts.minLeadHours  мінімум годин від зараз до слоту (default 2)
 */
export function computeAvailableSlots(business, service, existing = [], timeOff = [], opts = {}) {
  if (!business || !service) return []

  const slotMin = business.slot_minutes || 30
  const durMin = service.duration_min || service.durationMin || 60
  const bufMin = service.buffer_min || service.bufferMin || 0
  const schedule = business.schedule || {}

  const days = opts.days || 14
  const from = opts.fromDate || new Date()
  const minLeadMs = (opts.minLeadHours ?? 2) * 60 * 60 * 1000
  const earliest = new Date(Date.now() + minLeadMs)

  // Нормалізуємо busy intervals (включаючи buffer)
  const busy = []
  for (const b of existing) {
    const start = new Date(b.start_at || b.start)
    const end = new Date(b.end_at || b.end)
    if (isNaN(start) || isNaN(end)) continue
    busy.push({
      start: new Date(start.getTime() - bufMin * 60 * 1000),
      end:   new Date(end.getTime()   + bufMin * 60 * 1000),
    })
  }
  for (const t of timeOff) {
    if (t.worker_id) continue  // ігноруємо per-worker time-off на цьому рівні
    const start = new Date(t.start_at)
    const end = new Date(t.end_at)
    if (!isNaN(start) && !isNaN(end)) busy.push({ start, end })
  }

  // Сортуємо busy для швидкого пошуку
  busy.sort((a, b) => a.start - b.start)

  const slots = []
  const startDay = new Date(from)
  startDay.setHours(0, 0, 0, 0)

  for (let d = 0; d < days; d++) {
    const day = new Date(startDay)
    day.setDate(day.getDate() + d)
    const weekday = DAY_KEYS[day.getDay()]
    const sched = schedule[weekday]
    if (!sched?.enabled) continue

    // Денний діапазон роботи
    const open = new Date(day); open.setHours(sched.open, 0, 0, 0)
    const close = new Date(day); close.setHours(sched.close, 0, 0, 0)
    if (close <= open) continue

    // Йдемо slot grid по slotMin кроках
    let cursor = new Date(open)
    while (cursor.getTime() + durMin * 60 * 1000 <= close.getTime()) {
      const slotEnd = new Date(cursor.getTime() + durMin * 60 * 1000)

      // Skip слоти що в минулому або занадто скоро
      if (cursor < earliest) {
        cursor = new Date(cursor.getTime() + slotMin * 60 * 1000)
        continue
      }

      // Перевірка conflict з busy
      const conflicts = busy.some((b) =>
        cursor < b.end && slotEnd > b.start
      )

      if (!conflicts) {
        slots.push({ start: new Date(cursor), end: slotEnd })
      }

      cursor = new Date(cursor.getTime() + slotMin * 60 * 1000)
    }
  }

  return slots
}

/**
 * Групує слоти по днях для зручного UI.
 * Повертає Array<{ date: Date, slots: Array<{ start, end }> }>.
 */
export function groupSlotsByDay(slots) {
  const map = new Map()
  for (const s of slots) {
    const key = s.start.toDateString()
    if (!map.has(key)) map.set(key, { date: new Date(s.start.getFullYear(), s.start.getMonth(), s.start.getDate()), slots: [] })
    map.get(key).slots.push(s)
  }
  return Array.from(map.values())
}

/**
 * Форматує час слоту: "9:30 AM"
 */
export function formatSlotTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/**
 * Форматує дату дня: "Mon, May 20"
 */
export function formatSlotDay(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
