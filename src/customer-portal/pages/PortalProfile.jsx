import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck } from 'lucide-react'
import { toast } from 'sonner'
import PortalAvatar from '../components/PortalAvatar'
import PortalHeader from '../components/PortalHeader'
import FloatingBackground from '../components/FloatingBackground'
import { CardSkeleton } from '../components/PortalSkeletons'
import { useCustomer } from '../hooks/useCustomer'
import { usePortalData } from '../hooks/usePortalData'

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Jain', 'No onion & garlic', 'Gluten-free', 'Egg-free']
const SPICE_OPTIONS = ['Mild', 'Medium', 'Spicy', 'Extra spicy']

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

function Field({ label, testId, ...props }) {
  return (
    <div>
      <label className="lmp-label" htmlFor={testId}>{label}</label>
      <input id={testId} data-testid={testId} className="lmp-field" {...props} />
    </div>
  )
}

export default function PortalProfile() {
  const { customer, setCustomer, loading, error, refresh, supabase, user } = useCustomer()
  const portal = usePortalData(customer, supabase)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (customer && !form) {
      setForm({
        phone: customer.contact ?? '',
        address: customer.address ?? '',
        delivery_instructions: customer.delivery_instructions ?? '',
        dietary_preferences: customer.dietary_preferences ?? [],
        spice_preference: customer.spice_preference ?? '',
        allergies: (customer.allergies ?? []).join(', '),
      })
    }
  }, [customer, form])

  if (loading || !form) {
    return (
      <div className="min-h-screen relative">
        <FloatingBackground />
        <PortalHeader user={user} subscription={portal.subscription} business={portal.business} />
        <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <CardSkeleton testId="profile-skeleton" lines={5} />
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen relative">
        <FloatingBackground />
        <PortalHeader user={user} subscription={portal.subscription} business={portal.business} />
        <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 text-amber-900" data-testid="profile-error-card">
            <p className="font-medium mb-3 mt-0">We couldn&apos;t load your profile.</p>
            <button className="lmp-btn-secondary" data-testid="profile-retry-button" onClick={refresh}>Try again</button>
          </div>
        </main>
      </div>
    )
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleDiet = (opt) =>
    setForm((f) => ({
      ...f,
      dietary_preferences: f.dietary_preferences.includes(opt)
        ? f.dietary_preferences.filter((d) => d !== opt)
        : [...f.dietary_preferences, opt],
    }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        contact: form.phone || null,
        address: form.address || null,
        delivery_instructions: form.delivery_instructions || null,
        dietary_preferences: form.dietary_preferences,
        spice_preference: form.spice_preference || null,
        allergies: form.allergies.split(',').map((s) => s.trim()).filter(Boolean),
      }
      const { data, error: upErr } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', customer.id)
        .select()
        .single()
      if (upErr) throw upErr
      setCustomer(data)

      // If this profile has no subscription yet, try to claim an admin-created
      // customer record by phone number (links subscription, orders, invoices).
      if (!portal.subscription && form.phone) {
        try {
          const { data: claimed } = await supabase.rpc('claim_customer_by_phone', {
            p_stub_id: data.id,
            p_phone: form.phone,
            p_email: user?.primaryEmailAddress?.emailAddress ?? null,
            p_image_url: user?.imageUrl ?? null,
          })
          if (claimed && claimed.id && claimed.id !== data.id) {
            setCustomer(claimed)
            portal.refresh()
            toast.success('Account linked', {
              description: 'We found your Lunchmate account by phone number — your subscription is now connected.',
            })
            return
          }
        } catch (claimErr) {
          console.warn('claim_customer_by_phone failed', claimErr)
          toast.warning("Profile saved — but we couldn't link your subscription automatically. Please contact Lunchmate support.")
          return
        }
      }
      toast.success('Profile saved', { description: 'Your information has been updated.' })
    } catch {
      toast.error("We couldn't update your profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const sub = portal.subscription
  const name = user?.fullName || customer?.name || 'Customer'
  const email = user?.primaryEmailAddress?.emailAddress || customer?.google_email || ''

  return (
    <div className="min-h-screen relative">
      <FloatingBackground />
      <PortalHeader user={user} subscription={sub} business={portal.business} />

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 lmp-page-enter" data-testid="profile-page">
        <Link to="/" data-testid="profile-back-link" className="lmp-btn-ghost text-sm mb-4 -ml-3 no-underline inline-flex">
          <ArrowLeft size={15} /> Back to dashboard
        </Link>

        <div className="flex items-center gap-4 mb-8 mt-4">
          <PortalAvatar url={user?.imageUrl} name={name} size={72} imageTestId="profile-avatar-image" fallbackTestId="profile-avatar-fallback" className="shadow-sm" />
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1A2420] truncate m-0" data-testid="profile-full-name">
              {name}
            </h1>
            <p className="text-sm text-[#526058] truncate m-0" data-testid="profile-email">{email}</p>
          </div>
        </div>

        <form onSubmit={save} className="space-y-6 lmp-stagger">
          <section className="lmp-card p-5 sm:p-6" data-testid="profile-personal-section">
            <p className="lmp-caption mb-4">Personal Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="lmp-label">Full name</span>
                <p className="text-sm text-[#1A2420] py-2.5 m-0" data-testid="profile-name-readonly">{name}</p>
              </div>
              <div>
                <span className="lmp-label">Email</span>
                <p className="text-sm text-[#1A2420] py-2.5 truncate m-0" data-testid="profile-email-readonly">{email}</p>
              </div>
              <Field label="Phone number" testId="profile-phone-input" value={form.phone} onChange={set('phone')} placeholder="+91 …" inputMode="tel" />
              <div>
                <span className="lmp-label">Customer ID</span>
                <p className="text-sm text-[#808D85] py-2.5 font-mono m-0" data-testid="profile-customer-id">
                  {customer.customer_id_lm ?? customer.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
          </section>

          <section className="lmp-card p-5 sm:p-6" data-testid="profile-delivery-section">
            <p className="lmp-caption mb-4">Delivery Information</p>
            <div className="space-y-4">
              <div>
                <label className="lmp-label" htmlFor="profile-address-input">Delivery address</label>
                <textarea
                  id="profile-address-input"
                  data-testid="profile-address-input"
                  className="lmp-field resize-none"
                  rows={2}
                  value={form.address}
                  onChange={set('address')}
                  placeholder="Flat / street, area, Kakinada, PIN code"
                />
              </div>
              <div>
                <label className="lmp-label" htmlFor="profile-instructions-input">Delivery instructions</label>
                <textarea
                  id="profile-instructions-input"
                  data-testid="profile-instructions-input"
                  className="lmp-field resize-none"
                  rows={2}
                  value={form.delivery_instructions}
                  onChange={set('delivery_instructions')}
                  placeholder="Gate code, landmark, preferred drop spot…"
                />
              </div>
            </div>
          </section>

          <section className="lmp-card p-5 sm:p-6" data-testid="profile-account-section">
            <p className="lmp-caption mb-4">Account Information</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm m-0">
              <div className="flex justify-between sm:block">
                <dt className="text-[#808D85]">Member since</dt>
                <dd className="text-[#1A2420] font-medium m-0" data-testid="profile-member-since">{fmtDate(customer.created_at)}</dd>
              </div>
              <div className="flex justify-between sm:block">
                <dt className="text-[#808D85]">Subscription status</dt>
                <dd className="text-[#1A2420] font-medium capitalize flex items-center gap-1.5 m-0" data-testid="profile-subscription-status">
                  {sub?.subscription_state ?? 'No subscription'}
                  {sub?.subscription_state === 'active' && <BadgeCheck size={14} className="text-[#2E5B44]" />}
                </dd>
              </div>
              <div className="flex justify-between sm:block">
                <dt className="text-[#808D85]">Current plan</dt>
                <dd className="text-[#1A2420] font-medium m-0" data-testid="profile-current-plan">{sub?.plan_name ?? '—'}</dd>
              </div>
              <div className="flex justify-between sm:block">
                <dt className="text-[#808D85]">Credits remaining</dt>
                <dd className="text-[#1A2420] font-medium m-0" data-testid="profile-credits-remaining">
                  {sub ? `${sub.credits_remaining ?? 0} / ${sub.plan_credits ?? 0}` : '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="lmp-card p-5 sm:p-6" id="preferences" data-testid="profile-preferences-section">
            <p className="lmp-caption mb-4">Preferences</p>
            <div className="space-y-5">
              <div>
                <span className="lmp-label">Dietary preferences</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DIETARY_OPTIONS.map((opt) => {
                    const active = form.dietary_preferences.includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        data-testid={`diet-option-${opt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        onClick={() => toggleDiet(opt)}
                        className={`text-xs font-medium px-3 py-1.5 min-h-[36px] rounded-full border transition-all duration-150 active:scale-95 cursor-pointer ${
                          active
                            ? 'bg-[#1E3A2B] text-white border-[#1E3A2B]'
                            : 'bg-white text-[#526058] border-[#E5E2DA] hover:border-[#CFC8BA]'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="lmp-label" htmlFor="profile-spice-select">Spice preference</label>
                  <select
                    id="profile-spice-select"
                    data-testid="profile-spice-select"
                    className="lmp-field"
                    value={form.spice_preference}
                    onChange={set('spice_preference')}
                  >
                    <option value="">No preference</option>
                    {SPICE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <Field
                  label="Allergies / intolerances"
                  testId="profile-allergies-input"
                  value={form.allergies}
                  onChange={set('allergies')}
                  placeholder="Comma separated, e.g. peanuts, dairy"
                />
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3 pb-10">
            <button type="submit" data-testid="profile-form-save-button" className="lmp-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link to="/" className="lmp-btn-ghost no-underline" data-testid="profile-cancel-link">Cancel</Link>
          </div>
        </form>
      </main>
    </div>
  )
}
