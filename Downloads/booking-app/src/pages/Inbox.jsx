import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Mail, MessageSquare, Calendar, Check, X, MoreVertical, Sparkles } from 'lucide-react'
import { supabase } from '../supabase.js'
import { useBusiness } from '../context/BusinessContext.jsx'
import NewBookingModal from '../components/NewBookingModal.jsx'

/**
 * Inbox — список запитів від AI чату або форми "Request callback".
 * Менеджер бачить нові leads, контактує, конвертує у booking або відхиляє.
 */
export default function Inbox() {
  const { business, services } = useBusiness()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('new')
  const [convertingLead, setConvertingLead] = useState(null)
  const [transcriptLead, setTranscriptLead] = useState(null)

  useEffect(() => {
    if (!business?.id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('lead_requests')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
      if (!cancelled) {
        if (!error) setLeads(data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [business?.id, convertingLead])

  const filtered = leads.filter((l) => filter === 'all' || l.status === filter)
  const counts = {
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    all: leads.length,
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('lead_requests').update({ status }).eq('id', id)
    if (!error) setLeads((cur) => cur.map((l) => l.id === id ? { ...l, status } : l))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-ink-800">Inbox</h1>
          <p className="mt-1 text-ink-500">Requests from your AI chat and public forms.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={filter === 'new'} onClick={() => setFilter('new')}>New ({counts.new})</Chip>
        <Chip active={filter === 'contacted'} onClick={() => setFilter('contacted')}>Contacted ({counts.contacted})</Chip>
        <Chip active={filter === 'converted'} onClick={() => setFilter('converted')}>Converted</Chip>
        <Chip active={filter === 'dismissed'} onClick={() => setFilter('dismissed')}>Dismissed</Chip>
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All ({counts.all})</Chip>
      </div>

      {loading && <div className="card p-10 text-center text-ink-400">Loading…</div>}

      {!loading && filtered.length === 0 && (
        <div className="card p-10 text-center text-ink-400">
          {filter === 'new'
            ? 'No new leads. When customers chat with your AI assistant, their requests show up here.'
            : 'Nothing in this category.'}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((l) => (
            <LeadCard
              key={l.id}
              lead={l}
              service={services.find((s) => s.id === l.service_id)}
              onConvert={() => setConvertingLead(l)}
              onViewTranscript={() => setTranscriptLead(l)}
              onMarkContacted={() => updateStatus(l.id, 'contacted')}
              onDismiss={() => updateStatus(l.id, 'dismissed')}
              onReopen={() => updateStatus(l.id, 'new')}
            />
          ))}
        </div>
      )}

      {convertingLead && (
        <NewBookingModal
          prefill={{
            clientName: convertingLead.customer_name,
            clientPhone: convertingLead.customer_phone,
            address: convertingLead.address,
            serviceId: convertingLead.service_id,
            notes: convertingLead.message,
            start: convertingLead.preferred_time,
          }}
          onClose={() => setConvertingLead(null)}
          onCreated={async (newBookingId) => {
            // Позначити lead як converted і прив'язати booking
            await supabase
              .from('lead_requests')
              .update({ status: 'converted', booking_id: newBookingId })
              .eq('id', convertingLead.id)
            setConvertingLead(null)
          }}
        />
      )}

      {transcriptLead && (
        <TranscriptModal lead={transcriptLead} onClose={() => setTranscriptLead(null)} />
      )}
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-ink-800 text-ink-50' : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
      }`}
    >
      {children}
    </button>
  )
}

function LeadCard({ lead, service, onConvert, onViewTranscript, onMarkContacted, onDismiss, onReopen }) {
  const statusColor = {
    new: 'bg-amber-soft text-amber-deep',
    contacted: 'bg-blue-50 text-blue-700',
    converted: 'bg-moss-soft text-moss-deep',
    dismissed: 'bg-ink-100 text-ink-500',
  }[lead.status] || 'bg-ink-100 text-ink-500'

  const created = new Date(lead.created_at)
  const ago = formatTimeAgo(created)
  const isActionable = lead.status === 'new' || lead.status === 'contacted'

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
              {lead.status.toUpperCase()}
            </span>
            <span className="text-xs text-ink-400">{ago}</span>
            {lead.source === 'chat' && (
              <span className="inline-flex items-center gap-1 text-xs text-ink-400">
                <Sparkles size={11} /> AI chat
              </span>
            )}
          </div>
          <div className="mt-2 font-display text-2xl text-ink-800">{lead.customer_name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
            {lead.customer_phone && (
              <a href={`tel:${lead.customer_phone}`} className="inline-flex items-center gap-1 hover:text-ink-800">
                <Phone size={13} /> {lead.customer_phone}
              </a>
            )}
            {lead.customer_email && (
              <a href={`mailto:${lead.customer_email}`} className="inline-flex items-center gap-1 hover:text-ink-800">
                <Mail size={13} /> {lead.customer_email}
              </a>
            )}
          </div>
          {service && (
            <div className="mt-2 text-sm text-ink-600">
              <span className="text-ink-400">Service:</span> {service.name}
            </div>
          )}
          {lead.message && (
            <div className="mt-2 rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-700">
              "{lead.message}"
            </div>
          )}
          {lead.preferred_time && (
            <div className="mt-2 text-sm text-ink-500">
              <Calendar size={12} className="mr-1 inline" />
              Preferred: {new Date(lead.preferred_time).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isActionable && (
          <button onClick={onConvert} className="btn-accent">
            <Calendar size={14} /> Convert to booking
          </button>
        )}
        {lead.status === 'new' && (
          <button onClick={onMarkContacted} className="btn-ghost">
            <Check size={14} /> Mark contacted
          </button>
        )}
        {lead.transcript && (
          <button onClick={onViewTranscript} className="btn-ghost">
            <MessageSquare size={14} /> View chat
          </button>
        )}
        {isActionable && (
          <button onClick={onDismiss} className="ml-auto text-sm text-rose-700 hover:underline">
            Dismiss
          </button>
        )}
        {(lead.status === 'dismissed' || lead.status === 'converted') && (
          <button onClick={onReopen} className="ml-auto text-sm text-ink-500 hover:underline">
            Reopen
          </button>
        )}
      </div>
    </div>
  )
}

function TranscriptModal({ lead, onClose }) {
  const transcript = Array.isArray(lead.transcript) ? lead.transcript : []
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 p-4">
          <div>
            <div className="font-display text-xl text-ink-800">Chat with {lead.customer_name}</div>
            <div className="text-xs text-ink-400">{new Date(lead.created_at).toLocaleString()}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-ink-400 hover:bg-ink-100"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {transcript.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-ink-800 text-ink-50' : 'bg-ink-100 text-ink-700'}`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatTimeAgo(date) {
  const ms = Date.now() - date.getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}
