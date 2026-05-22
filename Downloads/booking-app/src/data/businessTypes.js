// Supported service business verticals. Each ships with sane defaults so
// onboarding can be one click.
export const BUSINESS_TYPES = [
  {
    id: 'landscaping',
    label: 'Landscaping & Lawn Care',
    emoji: '🌿',
    palette: 'moss',
    defaultServices: [
      { name: 'Lawn mowing', durationMin: 45, basePrice: 55, unit: 'visit' },
      { name: 'Hedge trimming', durationMin: 60, basePrice: 85, unit: 'visit' },
      { name: 'Spring cleanup', durationMin: 180, basePrice: 220, unit: 'visit' },
      { name: 'Mulch install', durationMin: 120, basePrice: 350, unit: 'yard' },
    ],
  },
  {
    id: 'window-cleaning',
    label: 'Window Cleaning',
    emoji: '🪟',
    palette: 'amber',
    defaultServices: [
      { name: 'Interior windows', durationMin: 60, basePrice: 120, unit: 'visit' },
      { name: 'Exterior windows', durationMin: 60, basePrice: 140, unit: 'visit' },
      { name: 'Full house (in + out)', durationMin: 150, basePrice: 240, unit: 'visit' },
      { name: 'Screens & tracks', durationMin: 30, basePrice: 60, unit: 'visit' },
    ],
  },
  {
    id: 'house-cleaning',
    label: 'House Cleaning',
    emoji: '🧽',
    palette: 'moss',
    defaultServices: [
      { name: 'Standard clean', durationMin: 120, basePrice: 140, unit: 'visit' },
      { name: 'Deep clean', durationMin: 240, basePrice: 280, unit: 'visit' },
      { name: 'Move-in / move-out', durationMin: 300, basePrice: 380, unit: 'visit' },
    ],
  },
  {
    id: 'pool-service',
    label: 'Pool Service',
    emoji: '💧',
    palette: 'amber',
    defaultServices: [
      { name: 'Weekly chemical check', durationMin: 30, basePrice: 65, unit: 'visit' },
      { name: 'Filter clean', durationMin: 45, basePrice: 95, unit: 'visit' },
      { name: 'Pool opening', durationMin: 180, basePrice: 320, unit: 'visit' },
    ],
  },
  {
    id: 'pest-control',
    label: 'Pest Control',
    emoji: '🪲',
    palette: 'amber',
    defaultServices: [
      { name: 'General pest treatment', durationMin: 60, basePrice: 120, unit: 'visit' },
      { name: 'Rodent inspection', durationMin: 90, basePrice: 180, unit: 'visit' },
      { name: 'Termite inspection', durationMin: 120, basePrice: 220, unit: 'visit' },
    ],
  },
  {
    id: 'pressure-washing',
    label: 'Pressure Washing',
    emoji: '💦',
    palette: 'amber',
    defaultServices: [
      { name: 'Driveway wash', durationMin: 90, basePrice: 180, unit: 'visit' },
      { name: 'House soft wash', durationMin: 180, basePrice: 360, unit: 'visit' },
      { name: 'Deck / patio', durationMin: 120, basePrice: 240, unit: 'visit' },
    ],
  },
  {
    id: 'handyman',
    label: 'Handyman',
    emoji: '🔧',
    palette: 'amber',
    defaultServices: [
      { name: 'General handyman (hourly)', durationMin: 60, basePrice: 90, unit: 'hour' },
      { name: 'TV mounting', durationMin: 60, basePrice: 140, unit: 'visit' },
      { name: 'Furniture assembly', durationMin: 90, basePrice: 160, unit: 'visit' },
    ],
  },
  {
    id: 'mobile-detailing',
    label: 'Mobile Auto Detailing',
    emoji: '🚗',
    palette: 'moss',
    defaultServices: [
      { name: 'Express wash', durationMin: 45, basePrice: 70, unit: 'visit' },
      { name: 'Interior + exterior detail', durationMin: 180, basePrice: 240, unit: 'visit' },
      { name: 'Ceramic coating', durationMin: 360, basePrice: 850, unit: 'visit' },
    ],
  },
]

export const getBusinessType = (id) => BUSINESS_TYPES.find((b) => b.id === id) ?? BUSINESS_TYPES[0]
