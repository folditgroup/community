import { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { supabase, supabaseReady } from '../supabase.js'

/**
 * Завантаження зображення в Supabase Storage (bucket: profile-images).
 * Файли зберігаються за шляхом: {businessId}/{kind}-{timestamp}.{ext}
 * RLS на бакеті дозволяє писати тільки якщо folder = твій businessId.
 *
 * Props:
 *   value      - поточний URL (або null)
 *   onChange   - (newUrl|null) => void
 *   businessId - UUID бізнесу (для папки)
 *   kind       - 'cover' | 'avatar' (для імені файлу та превʼю)
 *   aspect     - 'wide' | 'square'
 */
export default function ImageUpload({ value, onChange, businessId, kind = 'cover', aspect = 'wide' }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pick = () => inputRef.current?.click()

  const handle = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // дозволити перезалити той самий файл
    if (!file) return
    if (!supabaseReady) { setError('Supabase not configured.'); return }
    if (!businessId) { setError('Save the business first, then upload images.'); return }
    if (!file.type.startsWith('image/')) { setError('Only images allowed.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('File too large (max 5 MB).'); return }

    setError(''); setBusy(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${businessId}/${kind}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase
        .storage
        .from('profile-images')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('profile-images').getPublicUrl(path)
      onChange?.(data.publicUrl)
    } catch (err) {
      setError(err.message || 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const clear = () => onChange?.('')

  const aspectClass = aspect === 'square' ? 'aspect-square w-32' : 'aspect-[3/1] w-full'

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handle} />
      {value ? (
        <div className={`relative overflow-hidden rounded-xl bg-ink-100 ${aspectClass}`}>
          <img src={value} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
            <button type="button" onClick={pick} disabled={busy} className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-ink-700 hover:bg-white">
              {busy ? 'Uploading…' : 'Replace'}
            </button>
            <button type="button" onClick={clear} className="rounded-full bg-white/95 p-1 text-ink-700 hover:bg-white">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 bg-white text-ink-400 transition hover:border-ink-300 hover:bg-ink-50 ${aspectClass}`}
        >
          {busy ? (
            <span className="text-sm">Uploading…</span>
          ) : (
            <>
              <Upload size={20} />
              <span className="text-sm">Click to upload</span>
              <span className="text-xs">PNG/JPG, до 5 MB</span>
            </>
          )}
        </button>
      )}
      {error && <div className="mt-2 text-xs text-rose-700">{error}</div>}
    </div>
  )
}
