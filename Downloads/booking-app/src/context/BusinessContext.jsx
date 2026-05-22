import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseReady } from '../supabase.js'
import { useAuth } from './AuthContext.jsx'
import { BUSINESS_TYPES, getBusinessType } from '../data/businessTypes.js'
import {
  fromBusiness, toBusiness,
  fromWorker, toWorker,
  fromClient, toClient,
  fromService, toService,
  fromBooking, toBooking,
  fromOffer, toOffer,
} from '../lib/mappers.js'

const BusinessContext = createContext(null)

const EMPTY = { business: null, workers: [], clients: [], services: [], bookings: [], offers: [] }

export function BusinessProvider({ children }) {
  const { user } = useAuth()
  const [state, setState] = useState(EMPTY)
  const [loading, setLoading] = useState(true)  // починаємо з true щоб уникнути миттєвого CreateBusinessPrompt flash
  const [error, setError] = useState(null)

  const businessId = state.business?.id

  const refresh = useCallback(async () => {
    if (!supabaseReady) { setLoading(false); return }
    if (!user) { setState(EMPTY); setLoading(false); return }
    console.log('[refresh] starting, user.id =', user.id, 'email =', user.email)
    setLoading(true); setError(null)
    try {
      // Спершу шукаємо бізнес де я owner
      let biz = null
      {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (error) throw error
        biz = data
        console.log('[refresh] owner search result:', biz ? `FOUND business ${biz.id} "${biz.name}"` : 'NOT FOUND')
      }

      // Якщо не owner — шукаємо через worker рядок
      if (!biz) {
        const { data: myWorker, error: workerErr } = await supabase
          .from('workers')
          .select('business_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()
        console.log('[refresh] worker search:', { myWorker, workerErr })
        if (myWorker?.business_id) {
          const { data: bizAsWorker, error: be } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', myWorker.business_id)
            .maybeSingle()
          if (be) throw be
          biz = bizAsWorker
          console.log('[refresh] business via worker:', biz ? `FOUND ${biz.id}` : 'NOT FOUND (RLS blocked?)')
        }
      }

      if (!biz) {
        console.warn('[refresh] NO BUSINESS FOUND for user', user.id)
        // Скидаємо тільки якщо state.business немає (перший запуск).
        // Інакше user створив бізнес локально через createBusinessForUser, а refresh
        // тимчасово не бачить його (latency/cache) — НЕ скидаємо.
        setState((prev) => prev.business ? prev : EMPTY)
        return
      }
      const bid = biz.id
      const [w, c, s, b, o] = await Promise.all([
        supabase.from('workers').select('*').eq('business_id', bid).order('name'),
        supabase.from('clients').select('*').eq('business_id', bid).order('created_at', { ascending: false }),
        supabase.from('services').select('*').eq('business_id', bid).order('name'),
        supabase.from('bookings').select('*').eq('business_id', bid).order('start_at'),
        supabase.from('offers').select('*').eq('business_id', bid).order('created_at', { ascending: false }),
      ])
      if (w.error) throw w.error
      if (c.error) throw c.error
      if (s.error) throw s.error
      if (b.error) throw b.error
      if (o.error) throw o.error
      setState({
        business:  fromBusiness(biz),
        workers:   (w.data || []).map(fromWorker),
        clients:   (c.data || []).map(fromClient),
        services:  (s.data || []).map(fromService),
        bookings:  (b.data || []).map(fromBooking),
        offers:    (o.data || []).map(fromOffer),
      })
    } catch (e) {
      console.error('[refresh] ERROR:', e)
      setError(e.message || String(e))
      // КРИТИЧНО: НЕ скидаємо state.business до null при помилці.
      // Інакше юзер потрапить у loop де його просять створити бізнес знову,
      // він створює, setState ставить business, useEffect триггерить refresh,
      // refresh падає з помилкою (RLS, тощо) і знов скидає state → loop.
      // Залишаємо те що було — користувач бачить помилку, але не втрачає workspace.
    } finally {
      setLoading(false)
    }
  }, [user?.id])  // Використовуємо user.id (стабільний) замість user (reference change)

  useEffect(() => { refresh() }, [refresh])

  // --- mutations ---

  const createBusinessForUser = async ({ name, type, slug, city, phone, schedule, slotMinutes }) => {
    if (!user) throw new Error('Not signed in')

    console.log('[createBusinessForUser] user.id =', user.id, 'email =', user.email)

    // 1. Спочатку перевірити чи у мене вже є бізнес — щоб не дублювати при race condition.
    {
      const { data: existing, error: existingErr } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()
      console.log('[createBusinessForUser] existing check:', { existing, existingErr })
      if (existing) {
        // Встановлюємо state напряму
        const newBusiness = fromBusiness(existing)
        setState((prev) => ({ ...prev, business: newBusiness }))
        return newBusiness
      }
    }

    const typeDef = getBusinessType(type)

    // 2. Згенерувати slug. Якщо вже зайнятий — додаємо random suffix.
    const baseSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || 'workspace'
    let finalSlug = baseSlug
    {
      const { data: slugTaken } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle()
      if (slugTaken) {
        finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
      }
    }

    const payload = {
      ...toBusiness({
        name,
        slug: finalSlug,
        type,
        email: user.email,
        phone: phone || null,
        city: city || null,
        hours: { start: 7, end: 18 },
        workdays: [1, 2, 3, 4, 5, 6],
        schedule: schedule || undefined,
        slotMinutes: slotMinutes || 30,
        brandAccent: '#7BB661',
      }),
      owner_id: user.id,
    }

    console.log('[createBusinessForUser] INSERT payload:', payload)

    let biz
    const { data: insertedBiz, error: be } = await supabase.from('businesses').insert(payload).select().single()
    if (be) {
      console.error('[createBusinessForUser] INSERT error:', be)
      if (be.code === '23505' || /duplicate/i.test(be.message || '')) {
        payload.slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`
        const retry = await supabase.from('businesses').insert(payload).select().single()
        if (retry.error) throw retry.error
        biz = retry.data
      } else {
        throw be
      }
    } else {
      biz = insertedBiz
    }

    console.log('[createBusinessForUser] INSERTED business:', biz)

    await seedDefaults(biz.id, typeDef)

    // КРИТИЧНО: встановлюємо state НАПРЯМУ без покладання на refresh().
    // Це гарантує що Layout одразу побачить business і не покаже CreateBusinessPrompt.
    const newBusiness = fromBusiness(biz)
    setState((prev) => ({ ...prev, business: newBusiness }))
    setLoading(false)

    console.log('[createBusinessForUser] STATE SET with business:', newBusiness)

    return newBusiness
  }

  // Helper — наповнення дефолтними сервісами для індустрії
  const seedDefaults = async (bizId, typeDef) => {
    const defaults = (typeDef?.defaultServices || []).map((s) => toService(
      { name: s.name, durationMin: s.durationMin, basePrice: s.basePrice, unit: s.unit, active: true },
      bizId
    ))
    if (defaults.length) {
      await supabase.from('services').insert(defaults)  // не throw if fails — не критично
    }
  }

  const updateBusiness = async (patch) => {
    if (!businessId) return
    const merged = { ...state.business, ...patch }
    const { error } = await supabase
      .from('businesses')
      .update(toBusiness(merged))
      .eq('id', businessId)
    if (error) throw error
    await refresh()
  }

  const addWorker = async (w) => {
    if (!businessId) return
    const { error } = await supabase.from('workers').insert(toWorker(w, businessId))
    if (error) throw error
    await refresh()
  }
  const updateWorker = async (id, patch) => {
    const merged = { ...state.workers.find((x) => x.id === id), ...patch }
    const { error } = await supabase.from('workers').update(toWorker(merged, businessId)).eq('id', id)
    if (error) throw error
    await refresh()
  }
  const removeWorker = async (id) => {
    const { error } = await supabase.from('workers').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  const addClient = async (c) => {
    if (!businessId) return null
    const { data, error } = await supabase.from('clients').insert(toClient(c, businessId)).select().single()
    if (error) throw error
    await refresh()
    return fromClient(data)
  }
  const updateClient = async (id, patch) => {
    const merged = { ...state.clients.find((x) => x.id === id), ...patch }
    const { error } = await supabase.from('clients').update(toClient(merged, businessId)).eq('id', id)
    if (error) throw error
    await refresh()
  }
  const removeClient = async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  const addService = async (s) => {
    if (!businessId) return
    const { error } = await supabase.from('services').insert(toService(s, businessId))
    if (error) throw error
    await refresh()
  }
  const updateService = async (id, patch) => {
    const merged = { ...state.services.find((x) => x.id === id), ...patch }
    const { error } = await supabase.from('services').update(toService(merged, businessId)).eq('id', id)
    if (error) throw error
    await refresh()
  }
  const removeService = async (id) => {
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  const addBooking = async (b) => {
    if (!businessId) return null
    const { data, error } = await supabase.from('bookings').insert(toBooking(b, businessId)).select().single()
    if (error) throw error
    await refresh()
    return fromBooking(data)
  }
  const updateBooking = async (id, patch) => {
    const merged = { ...state.bookings.find((x) => x.id === id), ...patch }
    const { error } = await supabase.from('bookings').update(toBooking(merged, businessId)).eq('id', id)
    if (error) throw error
    await refresh()
  }
  const removeBooking = async (id) => {
    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  const addOffer = async (o) => {
    if (!businessId) return
    const { error } = await supabase.from('offers').insert(toOffer(o, businessId))
    if (error) throw error
    await refresh()
  }
  const updateOffer = async (id, patch) => {
    const merged = { ...state.offers.find((x) => x.id === id), ...patch }
    const { error } = await supabase.from('offers').update(toOffer(merged, businessId)).eq('id', id)
    if (error) throw error
    await refresh()
  }
  const removeOffer = async (id) => {
    const { error } = await supabase.from('offers').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  // Financial visibility — only the owner or a worker flagged is_manager
  // may see revenue / tips / profit. Regular crew cannot.
  const isOwner = !!user && state.business?.ownerId === user.id
  const myWorker = state.workers.find((w) => w.userId === user?.id)
  const isManager = isOwner || !!myWorker?.isManager
  const canSeeMoney = isManager

  const api = useMemo(() => ({
    ...state,
    loading,
    error,
    refresh,
    isOwner,
    isManager,
    canSeeMoney,
    createBusinessForUser,
    updateBusiness,
    addWorker, updateWorker, removeWorker,
    addClient, updateClient, removeClient,
    addService, updateService, removeService,
    addBooking, updateBooking, removeBooking,
    addOffer, updateOffer, removeOffer,
    businessTypes: BUSINESS_TYPES,
  }), [state, loading, error, refresh, isOwner, isManager, canSeeMoney])

  return <BusinessContext.Provider value={api}>{children}</BusinessContext.Provider>
}

export const useBusiness = () => useContext(BusinessContext)
