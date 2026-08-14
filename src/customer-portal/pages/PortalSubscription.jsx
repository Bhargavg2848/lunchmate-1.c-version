import { Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, CalendarDays, CreditCard } from 'lucide-react'
import PortalHeader from '../components/PortalHeader'
import FloatingBackground from '../components/FloatingBackground'
import { CardSkeleton } from '../components/PortalSkeletons'
import { useCustomer } from '../hooks/useCustomer'
import { usePortalData } from '../hooks/usePortalData'

const fmtDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const STATE_STYLES = {
  active: 'bg-[#F0F5F2] text-[#2E5B44] border-[#DCE8E0]',
  paused: 'bg-[#FEF3C7] text-amber-800 border-amber-700/20',
  completed: 'bg-[#F3F0EA] text-[#526058] border-[#E5E2DA]',
  cancelled: 'bg-[#F3F0EA] text-[#526058] border-[#E5E2DA]',
}

export default function PortalSubscription() {
  const { customer, loading: customerLoading, error, refresh, supabase, user } = useCustomer()
  const portal = usePortalData(customer, supabase)
  const loading = customerLoading || (customer && portal.loading)
  const sub = portal.subscription

  return (
    <div className="min-h-screen relative">
      <FloatingBackground />
      <PortalHeader user={user} subscription={sub} business={portal.business} />

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 lmp-page-enter" data-testid="subscription-page">
        <Link to="/" data-testid="subscription-back-link" className="lmp-btn-ghost text-sm mb-4 -ml-3 no-underline inline-flex">
          <ArrowLeft size={15} /> Back to dashboard
        </Link>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1A2420] mt-4 mb-6">My Subscription</h1>

        {loading ? (
          <CardSkeleton testId="subscription-skeleton" lines={5} />
        ) : error ? (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 text-amber-900" data-testid="subscription-error-card">
            <p className="font-medium mb-3 mt-0">We couldn&apos;t load your subscription.</p>
            <button className="lmp-btn-secondary" data-testid="subscription-retry-button" onClick={() => { refresh(); portal.refresh() }}>Try again</button>
          </div>
        ) : !sub ? (
          <section className="lmp-card p-6" data-testid="subscription-empty-state">
            <p className="text-sm text-[#526058] m-0">
              No subscription yet. Once Lunchmate sets up your plan, every detail will appear here.
            </p>
          </section>
        ) : (
          <div className="space-y-6 lmp-stagger">
            <section className="lmp-card p-5 sm:p-6" data-testid="subscription-plan-card">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <p className="lmp-caption mb-1.5">Current plan</p>
                  <p className="text-xl font-semibold tracking-tight text-[#1A2420] m-0" data-testid="subscription-plan-name">
                    {sub.plan_name ?? 'Subscription'}
                  </p>
                  <p className="text-xs text-[#808D85] mt-1 font-mono m-0" data-testid="subscription-order-id">{sub.order_id}</p>
                </div>
                <span
                  data-testid="subscription-status-badge"
                  className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border capitalize flex items-center gap-1.5 ${STATE_STYLES[sub.subscription_state] ?? STATE_STYLES.completed}`}
                >
                  {sub.subscription_state === 'active' && <BadgeCheck size={13} />}
                  {sub.subscription_state ?? 'active'}
                </span>
              </div>

              <div className="mb-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#808D85]">Meal credits</span>
                  <span className="font-semibold text-[#1A2420]" data-testid="subscription-credits-value">
                    {sub.credits_remaining ?? 0} of {sub.plan_credits ?? 0} remaining
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#F3F0EA] overflow-hidden">
                  <div
                    data-testid="subscription-credits-bar"
                    className="h-full rounded-full bg-[#1E3A2B] transition-all duration-500 ease-out"
                    style={{ width: `${sub.plan_credits > 0 ? Math.round(((sub.credits_remaining ?? 0) / sub.plan_credits) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center m-0">
                <div className="bg-[#FAF8F5] border border-[#E5E2DA] rounded-xl p-3">
                  <dt className="text-[11px] text-[#808D85] uppercase tracking-wider">Used</dt>
                  <dd className="text-lg font-semibold text-[#1A2420] m-0" data-testid="subscription-used-count">{sub.credits_used ?? 0}</dd>
                </div>
                <div className="bg-[#FAF8F5] border border-[#E5E2DA] rounded-xl p-3">
                  <dt className="text-[11px] text-[#808D85] uppercase tracking-wider">Delivered</dt>
                  <dd className="text-lg font-semibold text-[#2E5B44] m-0" data-testid="subscription-delivered-count">{sub.delivered_count ?? 0}</dd>
                </div>
                <div className="bg-[#FAF8F5] border border-[#E5E2DA] rounded-xl p-3">
                  <dt className="text-[11px] text-[#808D85] uppercase tracking-wider">Pending</dt>
                  <dd className="text-lg font-semibold text-[#1A2420] m-0" data-testid="subscription-pending-count">{sub.pending_count ?? 0}</dd>
                </div>
                <div className="bg-[#FAF8F5] border border-[#E5E2DA] rounded-xl p-3">
                  <dt className="text-[11px] text-[#808D85] uppercase tracking-wider">Skipped/Missed</dt>
                  <dd className="text-lg font-semibold text-amber-800 m-0" data-testid="subscription-missed-count">{sub.missed_count ?? 0}</dd>
                </div>
              </dl>
            </section>

            <section className="lmp-card p-5 sm:p-6" data-testid="subscription-schedule-card">
              <p className="lmp-caption mb-4 flex items-center gap-2"><CalendarDays size={13} /> Schedule</p>
              <dl className="space-y-2 text-sm m-0">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#808D85]">Next delivery</dt>
                  <dd className="text-[#1A2420] font-medium m-0" data-testid="subscription-next-delivery">{fmtDate(sub.next_delivery_date)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#808D85]">Payment status</dt>
                  <dd className="text-[#1A2420] font-medium capitalize m-0" data-testid="subscription-payment-status">
                    {(sub.payment_status ?? '').replace(/_/g, ' ') || '—'}
                  </dd>
                </div>
              </dl>
              <Link to="/billing" data-testid="subscription-billing-link" className="lmp-btn-secondary mt-5 text-xs no-underline inline-flex">
                <CreditCard size={14} /> View billing &amp; invoice
              </Link>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
