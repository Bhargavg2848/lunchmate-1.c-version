import { useCallback, useEffect, useState } from 'react'
import { FALLBACK_BUSINESS } from '../lib/portalSupabase'

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function usePortalData(customer, supabase) {
  const [data, setData] = useState({
    subscription: null,
    deliveries: [],
    transactions: [],
    messages: [],
    business: FALLBACK_BUSINESS,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!customer) return
    setLoading(true)
    setError(null)
    try {
      const lmId = customer.customer_id_lm ?? null

      // Admin source of truth: subscription_overview view, keyed by the LM customer code.
      const subPromise = lmId
        ? supabase
            .from('subscription_overview')
            .select('*')
            .eq('customer_id_string', lmId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })

      const ordersPromise = supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('order_type', 'subscription')

      const bizPromise = supabase.from('business_settings').select('value').eq('key', 'business').maybeSingle()

      const msgPromise = supabase
        .from('customer_feedback')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(5)

      const [subRes, ordersRes, bizRes, msgRes] = await Promise.all([subPromise, ordersPromise, bizPromise, msgPromise])
      const firstErr = subRes.error || ordersRes.error || bizRes.error || msgRes.error
      if (firstErr) throw firstErr

      const orderIds = (ordersRes.data ?? []).map((o) => o.id)
      let deliveries = []
      if (orderIds.length > 0) {
        const { data: delData, error: delErr } = await supabase
          .from('deliveries')
          .select('id, order_id, scheduled_date, status, meal_name_snapshot, meal_slot, skip_reason')
          .in('order_id', orderIds)
          .gte('scheduled_date', todayISO())
          .order('scheduled_date', { ascending: true })
          .order('meal_slot', { ascending: true })
          .limit(10)
        if (delErr) throw delErr
        deliveries = delData ?? []
      }

      let transactions = []
      const orderCode = subRes.data?.order_id ?? null
      if (orderCode) {
        const { data: txData, error: txErr } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('order_id', orderCode)
          .order('created_at', { ascending: false })
          .limit(5)
        if (txErr) throw txErr
        transactions = txData ?? []
      }

      setData({
        subscription: subRes.data ?? null,
        deliveries,
        transactions,
        messages: msgRes.data ?? [],
        business: bizRes.data?.value ?? FALLBACK_BUSINESS,
      })
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [customer, supabase])

  useEffect(() => {
    load()
  }, [load])

  // Real business rule: skip_delivery_and_extend marks the pending delivery as
  // missed and automatically creates a replacement day (credit preserved).
  const skipDelivery = useCallback(
    async (delivery) => {
      if (delivery.status !== 'pending' || delivery.scheduled_date <= todayISO()) {
        throw new Error('This delivery can no longer be skipped.')
      }
      const { error: rpcErr } = await supabase.rpc('skip_delivery_and_extend', {
        p_delivery_id: delivery.id,
        p_skip_reason: 'Skipped from customer portal',
      })
      if (rpcErr) throw rpcErr
      await load()
    },
    [supabase, load]
  )

  const sendKitchenMessage = useCallback(
    async ({ category, message }) => {
      const { error: insErr } = await supabase.from('customer_feedback').insert({
        customer_id: customer.id,
        customer_name: customer.name ?? null,
        clerk_user_id: customer.clerk_user_id ?? null,
        category,
        message,
      })
      if (insErr) throw insErr
      await load()
    },
    [customer, supabase, load]
  )

  return { ...data, loading, error, refresh: load, skipDelivery, sendKitchenMessage }
}
