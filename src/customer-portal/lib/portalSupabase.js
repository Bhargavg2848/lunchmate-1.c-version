import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://ukrztdeqzbbroowcphwk.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnp0ZGVxemJicm9vd2NwaHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTkzOTgsImV4cCI6MjA5OTE5NTM5OH0.uNmeVbQh9dlWfm_hJkZWn-1gItJo-Q4d4L-xoqOYCHc'

export const FALLBACK_BUSINESS = {
  name: 'Lunchmate',
  city: 'Kakinada',
  state: 'Andhra Pradesh',
  country: 'India',
}

// Supabase client that carries the Clerk session token (native third-party auth).
export function createClerkSupabaseClient(getToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    accessToken: async () => (await getToken()) ?? null,
  })
}
