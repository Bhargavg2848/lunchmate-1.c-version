import { Link } from 'react-router-dom'
import PortalHeader from '../components/PortalHeader'
import FloatingBackground from '../components/FloatingBackground'
import CreditsCard from '../components/CreditsCard'
import ScheduleCard from '../components/ScheduleCard'
import KitchenInbox from '../components/KitchenInbox'
import ReferralCard from '../components/ReferralCard'
import { DashboardSkeleton } from '../components/PortalSkeletons'
import { useCustomer } from '../hooks/useCustomer'
import { usePortalData } from '../hooks/usePortalData'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function ErrorCard({ onRetry }) {
  return (
    <div
      data-testid="dashboard-error-card"
      className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 text-amber-900"
    >
      <p className="font-medium mb-1 mt-0">We couldn&apos;t load your account.</p>
      <p className="text-sm opacity-80 mb-4">Please check your connection and try again.</p>
      <button data-testid="dashboard-retry-button" className="lmp-btn-secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

export default function PortalDashboard() {
  const { customer, loading: customerLoading, error: customerError, refresh, supabase, user } = useCustomer()
  const portal = usePortalData(customer, supabase)

  const loading = customerLoading || (customer && portal.loading)
  const error = customerError || portal.error
  const firstName = customer?.name?.split(' ')[0] || user?.firstName || 'there'
  const todayLine = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen relative">
      <FloatingBackground />
      <PortalHeader user={user} subscription={portal.subscription} business={portal.business} />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <ErrorCard onRetry={() => { refresh(); portal.refresh() }} />
        ) : (
          <div className="lmp-page-enter space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1A2420] m-0" data-testid="dashboard-greeting">
                {greeting()}, {firstName}
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-[#526058] m-0" data-testid="dashboard-date-line">
                {todayLine} · {portal.business.city}, {portal.business.state}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lmp-stagger">
              <CreditsCard subscription={portal.subscription} />
              <ReferralCard customer={customer} supabase={supabase} hasSubscription={!!portal.subscription} />
            </div>

            <ScheduleCard deliveries={portal.deliveries} skipDelivery={portal.skipDelivery} menuItems={portal.menuItems} changeMeal={portal.changeMeal} rescheduleDelivery={portal.rescheduleDelivery} />
            <KitchenInbox messages={portal.messages} sendKitchenMessage={portal.sendKitchenMessage} />

            <p className="text-center text-xs text-[#A8B3AC] pt-2 pb-6" data-testid="dashboard-footer">
              Lunchmate · {portal.business.city}, {portal.business.state}, {portal.business.country} ·{' '}
              <Link to="/profile" className="underline underline-offset-2 hover:text-[#526058] transition-colors">
                Manage profile
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
