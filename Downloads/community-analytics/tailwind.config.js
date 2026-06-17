/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand green — accent only (logo dot, chart fills, progress, "on" toggle, table top border)
        'brand-green': '#00C48C',
        'brand-green-text': '#00A878',
        'brand-green-bg': '#ECFDF5',
        // Ink / black
        ink: '#0A0A0A',
        // Text greys
        'text-primary': '#374151',
        'text-secondary': '#4B5563',
        'text-muted': '#9CA3AF',
        'text-label': '#6B7280',
        'text-rank': '#C4C4C4',
        // Surfaces
        surface: '#FFFFFF',
        'surface-alt': '#F9F9F9',
        'surface-hover': '#F1F1F1',
        'surface-active': '#EDEDED',
        // Borders
        border: '#ECECEC',
        'border-inner': '#F2F2F2',
        'border-hairline': '#F0F0F0',
        'border-input': '#E5E7EB',
        'border-dashed': '#D8D8D8',
        'toggle-off': '#D1D5DB',
        // Negative / red
        red: '#E5484D',
        'red-bg': '#FEF2F2',
      },
      fontFamily: {
        sans: [
          'Hanken Grotesk',
          '-apple-system',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        // tokens from the spec scale
        '2xs': ['11px', '1.4'],
        '11': ['11px', '1.4'],
        '11.5': ['11.5px', '1.4'],
        '12': ['12px', '1.4'],
        '12.5': ['12.5px', '1.4'],
        '13': ['13px', '1.45'],
        '13.5': ['13.5px', '1.45'],
        '14': ['14px', '1.4'],
        '15': ['15px', '1.3'],
        '17': ['17px', '1.2'],
        '18': ['18px', '1.2'],
        '19': ['19px', '1.1'],
        '28': ['28px', '1'],
      },
    },
  },
  plugins: [],
};
