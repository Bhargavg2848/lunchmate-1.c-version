import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PortalHeader from '../components/PortalHeader'
import FloatingBackground from '../components/FloatingBackground'
import BillingCard from '../components/BillingCard'
import { CardSkeleton } from '../components/PortalSkeletons'
import { useCustomer } from '../hooks/useCustomer'
import { usePortalData } from '../hooks/usePortalData'

export default function PortalBilling() {
  const { customer, loading: customerLoading, error, refresh, supabase, user } = useCustomer()
  const portal = usePortalData(customer, supabase)
  const loading = customerLoading || (customer && portal.loading)

  return (
    <div className="min-h-screen relative">
      <FloatingBackground />
      <PortalHeader user={user} subscription={portal.subscription} business={portal.business} />

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 lmp-page-enter" data-testid="billing-page">
        <Link to="/" data-testid="billing-back-link" className="lmp-btn-ghost text-sm mb-4 -ml-3 no-underline inline-flex">
          <ArrowLeft size={15} /> Back to dashboard
        </Link>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1A2420] mt-4 mb-6">Billing &amp; Invoices</h1>

        {loading ? (
          <CardSkeleton testId="billing-skeleton" lines={5} />
        ) : error ? (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 text-amber-900" data-testid="billing-error-card">
            <p className="font-medium mb-3 mt-0">We couldn&apos;t load your billing information.</p>
            <button className="lmp-btn-secondary" data-testid="billing-retry-button" onClick={() => { refresh(); portal.refresh() }}>Try again</button>
          </div>
        ) : (
          <BillingCard subscription={portal.subscription} transactions={portal.transactions} />
        )}
      </main>
    </div>
  )
}
