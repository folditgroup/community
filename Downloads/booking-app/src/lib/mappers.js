// Convert between Postgres snake_case rows and the camelCase shape the UI uses.

export const fromBusiness = (r) => r && ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  slug: r.slug,
  type: r.type,
  email: r.email,
  phone: r.phone,
  city: r.city,
  hours: r.hours ?? { start: 7, end: 18 },
  workdays: r.workdays ?? [1, 2, 3, 4, 5, 6],
  schedule: r.schedule ?? null,
  slotMinutes: r.slot_minutes ?? 30,
  brandAccent: r.brand_accent ?? '#7BB661',
  description: r.description ?? '',
  tagline: r.tagline ?? '',
  heroImageUrl: r.hero_image_url ?? '',
  avatarUrl: r.avatar_url ?? '',
  websiteUrl: r.website_url ?? '',
  instagram: r.instagram ?? '',
  isPublic: r.is_public ?? true,
  acceptingBookings: r.accepting_bookings ?? true,
})

export const toBusiness = (b) => ({
  name: b.name,
  slug: b.slug,
  type: b.type,
  email: b.email ?? null,
  phone: b.phone ?? null,
  city: b.city ?? null,
  hours: b.hours,
  workdays: b.workdays,
  schedule: b.schedule ?? undefined,
  slot_minutes: b.slotMinutes ?? undefined,
  brand_accent: b.brandAccent ?? '#7BB661',
  description: b.description ?? null,
  tagline: b.tagline ?? null,
  hero_image_url: b.heroImageUrl ?? null,
  avatar_url: b.avatarUrl ?? null,
  website_url: b.websiteUrl ?? null,
  instagram: b.instagram ?? null,
  is_public: b.isPublic ?? true,
  accepting_bookings: b.acceptingBookings ?? true,
})

export const fromOffer = (r) => ({
  id: r.id,
  businessId: r.business_id,
  title: r.title,
  description: r.description ?? '',
  price: r.price == null ? null : Number(r.price),
  originalPrice: r.original_price == null ? null : Number(r.original_price),
  validUntil: r.valid_until,
  active: r.active !== false,
  createdAt: r.created_at,
})

export const toOffer = (o, businessId) => ({
  business_id: businessId,
  title: o.title,
  description: o.description ?? null,
  price: o.price ?? null,
  original_price: o.originalPrice ?? null,
  valid_until: o.validUntil ?? null,
  active: o.active !== false,
})

export const fromWorker = (r) => ({
  id: r.id,
  businessId: r.business_id,
  userId: r.user_id,
  name: r.name,
  role: r.role,
  email: r.email,
  phone: r.phone,
  color: r.color || '#7BB661',
  skills: r.skills ?? [],
  hireDate: r.hire_date,
  isManager: r.is_manager ?? false,
})

export const toWorker = (w, businessId) => ({
  business_id: businessId,
  name: w.name,
  role: w.role ?? null,
  email: w.email ?? null,
  phone: w.phone ?? null,
  color: w.color ?? '#7BB661',
  skills: w.skills ?? [],
  hire_date: w.hireDate ?? null,
  is_manager: w.isManager ?? false,
})

export const fromClient = (r) => ({
  id: r.id,
  businessId: r.business_id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  address: r.address,
  tags: r.tags ?? [],
  notes: r.notes,
  createdAt: r.created_at,
})

export const toClient = (c, businessId) => ({
  business_id: businessId,
  name: c.name,
  email: c.email ?? null,
  phone: c.phone ?? null,
  address: c.address ?? null,
  tags: c.tags ?? [],
  notes: c.notes ?? null,
})

export const fromService = (r) => ({
  id: r.id,
  businessId: r.business_id,
  name: r.name,
  durationMin: r.duration_min,
  basePrice: Number(r.base_price),
  unit: r.unit ?? 'visit',
  active: r.active !== false,
  bufferMin: r.buffer_min ?? 15,
  priceType: r.price_type ?? 'fixed',  // 'fixed' | 'from' | 'quote'
})

export const toService = (s, businessId) => ({
  business_id: businessId,
  name: s.name,
  duration_min: s.durationMin,
  base_price: s.basePrice,
  unit: s.unit ?? 'visit',
  active: s.active !== false,
  buffer_min: s.bufferMin ?? 15,
  price_type: s.priceType ?? 'fixed',
})

export const fromBooking = (r) => ({
  id: r.id,
  businessId: r.business_id,
  clientId: r.client_id,
  serviceId: r.service_id,
  workerIds: r.worker_ids ?? [],
  start: r.start_at,
  end: r.end_at,
  address: r.address ?? '',
  price: Number(r.price ?? 0),
  tip: Number(r.tip ?? 0),
  notes: r.notes ?? '',
  status: r.status ?? 'scheduled',
  createdAt: r.created_at,
})

export const toBooking = (b, businessId) => ({
  business_id: businessId,
  client_id: b.clientId ?? null,
  service_id: b.serviceId ?? null,
  worker_ids: b.workerIds ?? [],
  start_at: b.start,
  end_at: b.end,
  address: b.address ?? null,
  price: b.price ?? 0,
  tip: b.tip ?? 0,
  notes: b.notes ?? null,
  status: b.status ?? 'scheduled',
})
