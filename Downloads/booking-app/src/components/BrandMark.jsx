/**
 * Drevito brand mark — square logo з літерою "D" і листочком замість крапки над i.
 *
 * Props:
 *   size       — pixel size (default 32)
 *   variant    — 'dark' (зелений фон, кремовий D) або 'light' (кремовий фон, зелений D)
 *
 * Використання:
 *   <BrandMark size={36} variant="dark" />     // на світлій навігації
 *   <BrandMark size={36} variant="light" />    // на темному sidebar
 */
export default function BrandMark({ size = 32, variant = 'dark', className = '' }) {
  const bg = variant === 'dark' ? '#1F3A26' : '#F4F1E8'  // forest / paper
  const fg = variant === 'dark' ? '#F4F1E8' : '#1F3A26'
  const leaf = '#7BB661'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-label="Drevito"
    >
      <rect width="64" height="64" rx="14" fill={bg} />
      {/* Літера D */}
      <path
        d="M 18 16 L 18 48 L 32 48 C 41 48 47 41 47 32 C 47 23 41 16 32 16 Z M 25 23 L 31 23 C 36 23 40 27 40 32 C 40 37 36 41 31 41 L 25 41 Z"
        fill={fg}
      />
      {/* Листок над D — справа зверху */}
      <ellipse cx="42" cy="18" rx="4.5" ry="3" transform="rotate(-30 42 18)" fill={leaf} />
    </svg>
  )
}
