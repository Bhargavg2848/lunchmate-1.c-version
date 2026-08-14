import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Camera } from 'lucide-react'
import { toast } from 'sonner'
import PortalAvatar from '../components/PortalAvatar'
import PortalHeader from '../components/PortalHeader'
import FloatingBackground from '../components/FloatingBackground'
import { CardSkeleton } from '../components/PortalSkeletons'
import { useCustomer } from '../hooks/useCustomer'
import { usePortalData } from '../hooks/usePortalData'

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Jain', 'No onion & garlic', 'Gluten-free', 'Egg-free']
const SPICE_OPTIONS = ['Mild', 'Medium', 'Spicy', 'Extra spicy']
const GENDER_OPTIONS = ['Female', 'Male', 'Other', 'Prefer not to say']

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (customer && !form) {
      const nameParts = (customer.name ?? '').trim().split(/\s+/)
      setForm({
        first_name: customer.first_name ?? nameParts[0] ?? '',
        last_name: customer.last_name ?? nameParts.slice(1).join(' ') ?? '',
        name: customer.name ?? '',
        phone: customer.contact ?? '',
        alternate_contact: customer.alternate_contact ?? '',
        gender: customer.gender ?? '',
        date_of_birth: customer.date_of_birth ?? '',
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

  const changePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const before = user.imageUrl
      await user.setProfileImage({ file })
      await user.reload?.()
      const url = user.imageUrl
      if (!url || url === before) {
        toast.error("We couldn't update your photo. Please try again.")
        return
      }
      const { data, error: upErr } = await supabase
        .from('customers')
        .update({ image_url: url })
        .eq('id', customer.id)
        .select()
        .single()
      if (upErr) throw upErr
      if (data) setCustomer(data)
      toast.success('Profile photo updated')
    } catch {
      toast.error("We couldn't update your photo. Please try again.")
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fullName = [form.first_name, form.last_name].map((s) => s.trim()).filter(Boolean).join(' ')
      const payload = {
        name: fullName || form.name || null,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        contact: form.phone || null,
        alternate_contact: form.alternate_contact.trim() || null,
        address: form.address || null,
        delivery_instructions: form.delivery_instructions || null,
        dietary_preferences: form.dietary_preferences,
        spice_preference: form.spice_preference || null,
        allergies: form.allergies.split(',').map((s) => s.trim()).filter(Boolean),
      }
      // first_name/last_name columns may not exist yet — retry without them
      let { data, error: upErr } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', customer.id)
        .select()
        .single()
      if (upErr && /first_name|last_name/.test(upErr.message || '')) {
        delete payload.first_name
        delete payload.last_name
        ;({ data, error: upErr } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', customer.id)
          .select()
          .single())
      }
      if (upErr) throw upErr
      setCustomer(data)

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

  const checks = [
    { key: 'first_name', label: 'Add your first name', done: !!form.first_name.trim() },
    { key: 'last_name', label: 'Add your last name', done: !!form.last_name.trim() },
    { key: 'photo', label: 'Add a profile photo', done: !!(customer.image_url || user?.imageUrl) },
    { key: 'gender', label: 'Select your gender', done: !!form.gender },
    { key: 'dob', label: 'Add your date of birth', done: !!form.date_of_birth },
    { key: 'phone', label: 'Add your phone number', done: !!form.phone.trim() },
    { key: 'alt_phone', label: 'Add an alternate contact', done: !!form.alternate_contact.trim() },
    { key: 'address', label: 'Add your delivery address', done: !!form.address.trim() },
    { key: 'instructions', label: 'Add delivery instructions', done: !!form.delivery_instructions.trim() },
    { key: 'diet', label: 'Choose dietary preferences', done: form.dietary_preferences.length > 0 },
    { key: 'spice', label: 'Set spice preference', done: !!form.spice_preference },
    { key: 'allergies', label: 'Add allergies (or type "None")', done: form.allergies.trim().length > 0 },
  ]
  const pct = Math.round((checks.filter((c) => c.done).length / checks.length) * 100)
  const missing = checks.filter((c) => !c.done)

  return (
    <div className="min-h-screen relative">
      <FloatingBackground />
      <PortalHeader user={user} subscription={sub} business={portal.business} />

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 lmp-page-enter" data-testid="profile-page">
        <Link to="/" data-testid="profile-back-link" className="lmp-btn-ghost text-sm mb-4 -ml-3 no-underline inline-flex">
          <ArrowLeft size={15} /> Back to dashboard
        </Link>

        <div className="flex items-center gap-4 mb-6 mt-4">
          <div className="relative shrink-0">
            <PortalAvatar url={user?.imageUrl} name={name} size={72} imageTestId="profile-avatar-image" fallbackTestId="profile-avatar-fallback" className="shadow-sm" />
            <button
              type="button"
              data-testid="profile-photo-button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#1E3A2B] text-white flex items-center justify-center shadow-md border-2 border-[#FAF8F5] transition-all duration-150 hover:bg-[#172E22] active:scale-95 cursor-pointer disabled:opacity-50"
              aria-label="Change profile photo"
            >
              <Camera size={13} strokeWidth={2} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="profile-photo-input"
              onChange={changePhoto}
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1A2420] truncate m-0" data-testid="profile-full-name">
              {name}
            </h1>
            <p className="text-sm text-[#526058] truncate m-0" data-testid="profile-email">{email}</p>
          </div>
        </div>

        <section className="lmp-card p-5 sm:p-6 mb-6" data-testid="profile-completion-card">
          <div className="flex items-center justify-between mb-3">
            <p className="lmp-caption m-0">Profile completion</p>
            <p className="text-sm font-semibold text-[#1E3A2B] m-0" data-testid="profile-completion-value">{pct}%</p>
          </div>
          <div className="h-2.5 rounded-full bg-[#F3F0EA] overflow-hidden">
            <div
              data-testid="profile-completion-bar"
              className="h-full rounded-full bg-[#1E3A2B] transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          {missing.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-3">
              {missing.map((c) => (
                <span key={c.key} data-testid={`profile-missing-${c.key}`} className="text-[11px] text-[#526058] bg-[#F3F0EA] border border-[#E5E2DA] rounded-full px-2.5 py-1">
                  {c.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#2E5B44] mt-3 mb-0 flex items-center gap-1.5" data-testid="profile-complete-note">
              <BadgeCheck size={13} /> Your profile is 100% complete — thank you!
            </p>
          )}
        </section>

        <form onSubmit={save} className="space-y-6 lmp-stagger">
          <section className="lmp-card p-5 sm:p-6" data-testid="profile-personal-section">
            <p className="lmp-caption mb-4">Personal Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First name" testId="profile-first-name-input" value={form.first_name} onChange={set('first_name')} placeholder="First name" />
              <Field label="Last name" testId="profile-last-name-input" value={form.last_name} onChange={set('last_name')} placeholder="Last name" />
              <div>
                <label className="lmp-label" htmlFor="profile-gender-select">Gender</label>
                <select
                  id="profile-gender-select"
                  data-testid="profile-gender-select"
                  className="lmp-field"
                  value={form.gender}
                  onChange={set('gender')}
                >
                  <option value="">Select…</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <Field label="Date of birth" testId="profile-dob-input" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} max={new Date().toISOString().slice(0, 10)} />
              <Field label="Phone number" testId="profile-phone-input" value={form.phone} onChange={set('phone')} placeholder="+91 …" inputMode="tel" />
              <Field label="Alternate contact" testId="profile-alt-contact-input" value={form.alternate_contact} onChange={set('alternate_contact')} placeholder="Family / friend number" inputMode="tel" />
              <div>
                <span className="lmp-label">Email</span>
                <p className="text-sm text-[#1A2420] py-2.5 truncate m-0" data-testid="profile-email-readonly">{email}</p>
              </div>
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
            <button type="submit" data-testid="profile-form-save-button" className="lmp-btn-primary" disabled={saving || uploadingPhoto}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link to="/" className="lmp-btn-ghost no-underline" data-testid="profile-cancel-link">Cancel</Link>
          </div>
        </form>
      </main>
    </div>
  )
}
