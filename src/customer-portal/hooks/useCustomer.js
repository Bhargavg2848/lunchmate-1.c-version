import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { createClerkSupabaseClient } from '../lib/portalSupabase'

const filled = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''))

export function useCustomer() {
  const { getToken, isSignedIn, isLoaded: authLoaded } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const supabase = useMemo(() => createClerkSupabaseClient(getToken), [getToken])

  const sync = useCallback(async () => {
    if (!authLoaded || !userLoaded) return
    if (!isSignedIn || !user) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const email = user.primaryEmailAddress?.emailAddress ?? null
      const fullName = user.fullName ?? null

      // 1) Existing link via Clerk ID
      let { data: existing, error: findErr } = await supabase
        .from('customers')
        .select('*')
        .eq('clerk_user_id', user.id)
        .maybeSingle()
      if (findErr) throw findErr

      // 2) Claim an admin-created record by email (never create a duplicate)
      if (!existing && email) {
        const { data: byEmail, error: emailErr } = await supabase
          .from('customers')
          .select('*')
          .eq('google_email', email)
          .is('clerk_user_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (emailErr) throw emailErr
        existing = byEmail ?? null
      }

      let row
      if (existing) {
        // Clerk only supplies identity fields; business data is never overwritten.
        const patch = { clerk_user_id: user.id }
        if (!existing.name && fullName) patch.name = fullName
        if (!existing.google_email && email) patch.google_email = email
        if (!existing.image_url && user.imageUrl) patch.image_url = user.imageUrl
        const { data: updated, error: upErr } = await supabase
          .from('customers')
          .update(patch)
          .eq('id', existing.id)
          .select()
          .single()
        if (upErr) throw upErr
        row = updated
      } else {
        const { data: created, error: insErr } = await supabase
          .from('customers')
          .upsert(
            filled({ name: fullName, google_email: email, clerk_user_id: user.id, image_url: user.imageUrl }),
            { onConflict: 'clerk_user_id' }
          )
          .select()
          .single()
        if (insErr) throw insErr
        row = created
      }

      // Auto-claim an admin-created record when the Clerk profile carries a phone number.
      const clerkPhone = user.primaryPhoneNumber?.phoneNumber ?? null
      if (row && clerkPhone) {
        try {
          const { data: claimed } = await supabase.rpc('claim_customer_by_phone', {
            p_stub_id: row.id,
            p_phone: clerkPhone,
            p_email: email,
            p_image_url: user.imageUrl ?? null,
          })
          if (claimed && claimed.id && claimed.id !== row.id) row = claimed
        } catch {
          // best-effort linking
        }
      }
      setCustomer(row)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [authLoaded, userLoaded, isSignedIn, user, supabase])

  useEffect(() => {
    sync()
  }, [sync])

  return { customer, setCustomer, loading, error, refresh: sync, supabase, user }
}
