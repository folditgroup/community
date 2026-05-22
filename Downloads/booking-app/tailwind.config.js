/** @type {import('tailwindcss').Config} */
//
// Drevito brand palette
// =====================
// Beim rebrand "Drevito → Drevito" зберігаємо технічні Tailwind class-назви
// (`amber`, `moss`, `ink`) щоб не переписувати тисячу місць у коді,
// а просто замінюємо їх значення на нові brand кольори.
//
// • `ink-800` — DEEP FOREST GREEN (#1F3A26 з лого) — sidebar, dark surfaces, headings
// • `amber`   — LEAF GREEN (#7BB661 з листка) — CTA кнопки, акцент, active items
// • `moss`    — DARKER LEAF — для secondary акцентів
// • `ink-50`  — paper warm off-white — основне тло
//
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      colors: {
        // Темна паливо стала зеленою. ink-800 — це тепер той самий deep forest з лого.
        ink: {
          50:  '#F4F1E8',  // paper warm background
          100: '#E8E3D2',  // soft dividers / card outlines
          200: '#CFC8B0',
          300: '#9C9377',
          400: '#5C5A4E',  // muted text
          500: '#3A372E',
          600: '#2A2823',  // body text
          700: '#1C2A20',  // подибали зеленинку щоб гармоніювало з sidebar
          800: '#1F3A26',  // DEEP FOREST GREEN — sidebar, primary dark surface
          900: '#152918',  // ще темніший forest — overlays
        },
        // CTA accent — leaf green з лого
        amber: {
          DEFAULT: '#7BB661',  // leaf green — primary CTA color
          soft:    '#E3EDD9',  // pale moss — soft chips/badges
          deep:    '#4F8A3C',  // darker leaf — hover/active
        },
        // Secondary accent — глибше зелений
        moss: {
          DEFAULT: '#3F6B4A',  // medium forest — secondary
          soft:    '#D4E5C5',  // very light leaf
          deep:    '#1F3A26',  // same as primary dark
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,30,20,0.04), 0 8px 24px -8px rgba(20,30,20,0.08)',
        pop:  '0 4px 12px rgba(20,30,20,0.10), 0 24px 48px -16px rgba(20,30,20,0.18)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
}
