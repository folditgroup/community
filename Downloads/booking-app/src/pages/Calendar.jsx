import { useMemo, useState } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import enUS from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { useBusiness } from '../context/BusinessContext.jsx'
import BookingDetailModal from '../components/BookingDetailModal.jsx'
import NewBookingModal from '../components/NewBookingModal.jsx'

// Setup date-fns localizer
const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  getDay,
  locales,
})

// Wrap BigCalendar with DnD HOC
const DnDCalendar = withDragAndDrop(BigCalendar)

/**
 * Calendar with drag-and-drop.
 * - Drag empty slot → opens NewBookingModal pre-filled with start time
 * - Click event → opens BookingDetailModal (edit)
 * - Drag event to new time → updates start_at / end_at
 * - Resize event by edge → updates duration
 * - Worker colors shown via eventPropGetter
 */
export default function Calendar() {
  const { bookings, clients, services, workers, updateBooking } = useBusiness()
  const [selected, setSelected] = useState(null)
  const [newSlot, setNewSlot] = useState(null) // { start, end } when user drags empty slot

  // Конвертуємо bookings в формат що очікує react-big-calendar
  const events = useMemo(() => {
    return bookings.map((b) => {
      const client = clients.find((c) => c.id === b.clientId)
      const service = services.find((s) => s.id === b.serviceId)
      const firstWorker = workers.find((w) => w.id === b.workerIds?.[0])
      return {
        id: b.id,
        title: `${client?.name || 'Booking'}${service ? ` · ${service.name}` : ''}`,
        start: new Date(b.start),
        end: new Date(b.end),
        resource: b,
        workerColor: firstWorker?.color || '#7BB661',
        status: b.status,
      }
    })
  }, [bookings, clients, services, workers])

  // Drag event to new time slot
  const moveEvent = async ({ event, start, end }) => {
    const booking = event.resource
    try {
      await updateBooking(booking.id, {
        start: start.toISOString(),
        end: end.toISOString(),
      })
    } catch (e) {
      alert('Could not move booking: ' + (e.message || e))
    }
  }

  // Resize event (change duration)
  const resizeEvent = async ({ event, start, end }) => {
    const booking = event.resource
    try {
      await updateBooking(booking.id, {
        start: start.toISOString(),
        end: end.toISOString(),
      })
    } catch (e) {
      alert('Could not resize booking: ' + (e.message || e))
    }
  }

  // Click empty slot → new booking
  const handleSelectSlot = ({ start, end }) => {
    setNewSlot({ start, end })
  }

  // Click existing event → open detail
  const handleSelectEvent = (event) => {
    setSelected(event.resource)
  }

  // Per-event color from worker
  const eventPropGetter = (event) => {
    const color = event.workerColor || '#7BB661'
    const opacity = event.status === 'cancelled' ? 0.4 : event.status === 'done' ? 0.7 : 1
    return {
      style: {
        backgroundColor: color,
        borderLeft: `3px solid ${darken(color)}`,
        color: '#fff',
        opacity,
        borderRadius: '6px',
        fontSize: '12px',
        padding: '2px 6px',
      },
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-ink-800">Calendar</h1>
          <p className="mt-1 text-ink-500">Drag to move. Drag edges to resize. Click empty slot to create.</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="h-[700px] p-4">
          <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            onEventDrop={moveEvent}
            onEventResize={resizeEvent}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            resizable
            defaultView={Views.WEEK}
            views={[Views.DAY, Views.WEEK, Views.MONTH, Views.AGENDA]}
            step={30}
            timeslots={2}
            min={new Date(0, 0, 0, 6, 0)}
            max={new Date(0, 0, 0, 22, 0)}
            eventPropGetter={eventPropGetter}
            dayLayoutAlgorithm="no-overlap"
            popup
          />
        </div>
      </div>

      {selected && <BookingDetailModal booking={selected} onClose={() => setSelected(null)} />}
      {newSlot && (
        <NewBookingModal
          prefill={{ start: newSlot.start.toISOString(), end: newSlot.end.toISOString() }}
          onClose={() => setNewSlot(null)}
          onCreated={() => setNewSlot(null)}
        />
      )}
    </div>
  )
}

function darken(hex) {
  // Quick helper to darken hex by ~20%
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  let r = (num >> 16) & 0xff
  let g = (num >> 8) & 0xff
  let b = num & 0xff
  r = Math.max(0, Math.floor(r * 0.7))
  g = Math.max(0, Math.floor(g * 0.7))
  b = Math.max(0, Math.floor(b * 0.7))
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}
