import { useState } from 'react'
import { ReceiptText, ExternalLink, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { generateSubscriptionInvoice } from '../../lib/pdfGenerator'

const fmtINR = (amount) =>
  amount == null ? null : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount))

const STATE_STYLES = {
  active: 'bg-[#F0F5F2] text-[#2E5B44] border-[#DCE8E0]',
  paused: 'bg-[#FEF3C7] text-amber-800 border-amber-700/20',
  completed: 'bg-[#F3F0EA] text-[#526058] border-[#E5E2DA]',
  cancelled: 'bg-[#F3F0EA] text-[#526058] border-[#E5E2DA]',
}

const PAYMENT_LABEL = { not_paid: 'Not paid', partial: 'Partially paid', paid: 'Paid' }

export default function BillingCard({ subscription, transactions }) {
  if (!subscription) {
    return (
      <section className="lmp-card p-5 sm:p-6" id="billing" data-testid="billing-section-card">
        <p className="lmp-caption mb-3">Billing</p>
        <p className="text-sm text-[#526058] m-0" data-testid="billing-empty-state">
          No billing information yet. Your plan, payments and invoices will appear here once your subscription starts.
        </p>
      </section>
    )
  }

  const state = subscription.subscription_state ?? 'active'
  const stateClass = STATE_STYLES[state] ?? STATE_STYLES.completed
  const total = subscription.revised_total_amount ?? subscription.original_total_amount
  const invoiceTx = (transactions ?? []).find((t) => t.invoice_url)
  const [generating, setGenerating] = useState(false)

  const downloadInvoice = async () => {
    setGenerating(true)
    try {
      const result = await generateSubscriptionInvoice(subscription)
      if (result?.error) throw new Error(result.error)
    } catch {
      toast.error("We couldn't generate your invoice. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <section className="lmp-card p-5 sm:p-6" id="billing" data-testid="billing-section-card">
      <div className="flex items-center justify-between mb-4">
        <p className="lmp-caption m-0">Billing</p>
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F0F5F2] text-[#2E5B44]">
          <ReceiptText size={15} strokeWidth={1.8} />
        </span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-medium tracking-tight text-[#1A2420] truncate m-0" data-testid="billing-plan-name">
            {subscription.plan_name ?? 'Subscription'}
          </p>
          <p className="text-sm text-[#526058] m-0" data-testid="billing-plan-amount">
            {fmtINR(total) ?? '—'} · {subscription.payment_mode ?? ''}
          </p>
        </div>
        <span data-testid="billing-status-badge" className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${stateClass}`}>
          {state}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-sm m-0">
        <div className="flex justify-between gap-4">
          <dt className="text-[#808D85]">Order</dt>
          <dd className="text-[#1A2420] font-medium font-mono text-xs pt-0.5 m-0" data-testid="billing-order-id">
            {subscription.order_id ?? '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#808D85]">Payment status</dt>
          <dd className="text-[#1A2420] font-medium m-0" data-testid="billing-payment-status">
            {PAYMENT_LABEL[subscription.payment_status] ?? subscription.payment_status ?? '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#808D85]">Received</dt>
          <dd className="text-[#1A2420] font-medium m-0" data-testid="billing-amount-received">{fmtINR(subscription.amount_received) ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#808D85]">Balance due</dt>
          <dd className="text-[#1A2420] font-medium m-0" data-testid="billing-balance-due">{fmtINR(subscription.amount_due) ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#808D85]">Credits</dt>
          <dd className="text-[#1A2420] font-medium m-0" data-testid="billing-credits">
            {subscription.credits_remaining ?? 0} of {subscription.plan_credits ?? 0} left
          </dd>
        </div>
      </dl>

      {(transactions ?? []).length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#E5E2DA] space-y-1.5" data-testid="billing-payment-history">
          <p className="lmp-caption">Payment history</p>
          {transactions.slice(0, 3).map((t) => (
            <div key={t.id} className="flex justify-between text-sm" data-testid={`payment-transaction-${t.id}`}>
              <span className="text-[#526058] capitalize">{t.payment_mode ?? 'payment'}</span>
              <span className="text-[#1A2420] font-medium">{fmtINR(t.amount_paid)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        {invoiceTx ? (
          <a
            href={invoiceTx.invoice_url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="view-invoice-button"
            className="lmp-btn-primary no-underline"
          >
            View Invoice <ExternalLink size={14} />
          </a>
        ) : (
          <button
            data-testid="view-invoice-button"
            className="lmp-btn-primary"
            onClick={downloadInvoice}
            disabled={generating}
          >
            <FileDown size={14} /> {generating ? 'Preparing invoice…' : 'Download Invoice'}
          </button>
        )}
      </div>
    </section>
  )
}
