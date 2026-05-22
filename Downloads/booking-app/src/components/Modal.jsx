import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ title, subtitle, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }

  // Клік по затемненню (не по самій модалці) — закрити
  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.()
  }

  const content = (
    <div
      onClick={onBackdrop}
      className="fixed inset-0 z-[100] overflow-y-auto bg-ink-900/50 backdrop-blur-sm"
    >
      {/* Flex обгортка з min-h-full дає вертикальне центрування */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full ${widths[size]} my-8 rounded-3xl bg-ink-50 shadow-pop`}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-full p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={18} />
          </button>
          {(title || subtitle) && (
            <div className="px-7 pt-7 pr-14">
              {title && <h2 className="font-display text-3xl leading-tight text-ink-800">{title}</h2>}
              {subtitle && <p className="mt-1 text-sm text-ink-400">{subtitle}</p>}
            </div>
          )}
          <div className="px-7 py-6">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-2 rounded-b-3xl border-t border-ink-100 bg-white px-7 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // React Portal — рендерить модалку прямо в document.body, поза Layout/Sidebar/TopBar
  // ієрархією. Це гарантує що fixed positioning буде відносно viewport, без впливу
  // overflow-hidden батьків. Без портала модалка могла "застрягати" вгорі.
  return createPortal(content, document.body)
}
