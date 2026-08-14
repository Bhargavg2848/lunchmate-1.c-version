import { UtensilsCrossed } from 'lucide-react'

export default function CreditsCard({ subscription }) {
  if (!subscription) {
    return (
      <section className="lmp-card p-5 sm:p-6" data-testid="credits-display-card">
        <p className="lmp-caption mb-3">Meal Credits</p>
        <p className="text-sm text-[#526058] m-0" data-testid="credits-empty-state">
          No active subscription yet. Once Lunchmate sets up your plan, your meal credits will appear here.
        </p>
      </section>
    )
  }

  const total = Number(subscription.plan_credits ?? 0)
  const remaining = Number(subscription.credits_remaining ?? Math.max(total - Number(subscription.credits_used ?? 0), 0))
  const used = Number(subscription.credits_used ?? 0)
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0
  const nextDelivery = subscription.next_delivery_date
    ? new Date(`${subscription.next_delivery_date}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <section className="lmp-card p-5 sm:p-6" id="subscription" data-testid="credits-display-card">
      <div className="flex items-center justify-between mb-4">
        <p className="lmp-caption m-0">Meal Credits</p>
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F0F5F2] text-[#2E5B44]">
          <UtensilsCrossed size={15} strokeWidth={1.8} />
        </span>
      </div>
      <p className="text-3xl font-semibold tracking-tight text-[#1A2420] m-0" data-testid="credits-counter-value">
        {remaining} <span className="text-base font-normal text-[#808D85]">/ {total} remaining</span>
      </p>
      <div className="mt-4 h-2.5 rounded-full bg-[#F3F0EA] overflow-hidden">
        <div
          data-testid="credits-progress-bar"
          className="h-full rounded-full bg-[#1E3A2B] transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-[#808D85] m-0">
        {used} used{nextDelivery ? ` · next delivery ${nextDelivery}` : ''}
      </p>
    </section>
  )
}
