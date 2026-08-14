import { useState } from 'react'
import { CalendarDays, CookingPot, SkipForward } from 'lucide-react'
import { toast } from 'sonner'

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fmtDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

const STATUS_BADGE = {
  scheduled: 'bg-[#F0F5F2] text-[#2E5B44] border-[#DCE8E0]',
  preparing: 'bg-[#FEF3C7] text-amber-800 border-amber-700/20',
  neutral: 'bg-[#F3F0EA] text-[#808D85] border-[#E5E2DA]',
}

function statusDisplay(delivery, isToday) {
  if (isToday && delivery.status === 'pending') return { label: 'Preparing 🍳', cls: STATUS_BADGE.preparing }
  if (delivery.status === 'pending') return { label: 'Scheduled', cls: STATUS_BADGE.scheduled }
  if (delivery.status === 'delivered') return { label: 'Delivered', cls: STATUS_BADGE.neutral }
  if (delivery.status === 'missed') {
    return delivery.skip_reason
      ? { label: 'Skipped · credit saved', cls: STATUS_BADGE.neutral }
      : { label: 'Missed', cls: STATUS_BADGE.neutral }
  }
  return { label: delivery.status, cls: STATUS_BADGE.neutral }
}

function DeliveryRow({ delivery, isToday, onSkip, skipping }) {
  const canSkip = !isToday && delivery.status === 'pending' && delivery.scheduled_date > todayISO()
  const status = statusDisplay(delivery, isToday)
  const mealText =
    delivery.status === 'missed' && delivery.skip_reason
      ? 'Meal skipped — credit preserved'
      : delivery.meal_name_snapshot ?? 'Meal to be announced'

  return (
    <div
      data-testid={isToday ? 'delivery-card-today' : `delivery-card-${delivery.scheduled_date}-${delivery.meal_slot ?? 'meal'}`}
      className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border p-4 transition-all duration-300 ease-out ${
        isToday ? 'border-[#2E5B44]/25 bg-[#F0F5F2]/60' : 'border-[#E5E2DA] bg-white/70 hover:border-[#D8D2C6]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
            isToday ? 'bg-[#1E3A2B] text-[#FAF8F5]' : 'bg-[#F3F0EA] text-[#526058]'
          }`}
        >
          {isToday ? <CookingPot size={16} strokeWidth={1.8} /> : <CalendarDays size={16} strokeWidth={1.8} />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1A2420] m-0" data-testid={`delivery-date-${delivery.id}`}>
            {isToday ? 'Today' : fmtDay(delivery.scheduled_date)}
            {delivery.meal_slot ? <span className="ml-2 text-[11px] font-medium text-[#808D85] capitalize">{delivery.meal_slot}</span> : null}
          </p>
          <p className="text-sm text-[#526058] truncate m-0" data-testid={`delivery-meal-${delivery.id}`}>
            {mealText}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 pl-12 sm:pl-0">
        <span data-testid={`delivery-status-${delivery.id}`} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.cls}`}>
          {status.label}
        </span>
        {canSkip && (
          <button
            data-testid={`delivery-skip-button-${delivery.id}`}
            className="lmp-btn-amber"
            disabled={skipping}
            onClick={() => onSkip(delivery)}
          >
            <SkipForward size={13} /> Skip day
          </button>
        )}
      </div>
    </div>
  )
}

export default function ScheduleCard({ deliveries, skipDelivery }) {
  const [pendingSkip, setPendingSkip] = useState(null)
  const [skipping, setSkipping] = useState(false)
  const today = todayISO()

  const confirmSkip = async () => {
    if (!pendingSkip) return
    setSkipping(true)
    try {
      await skipDelivery(pendingSkip)
      toast.success('Meal skipped', { description: 'Your credit has been preserved — your plan extends by a day.' })
    } catch {
      toast.error("We couldn't skip this meal. Please try again.")
    } finally {
      setSkipping(false)
      setPendingSkip(null)
    }
  }

  return (
    <section className="lmp-card p-5 sm:p-6" data-testid="delivery-schedule-section">
      <div className="flex items-center justify-between mb-4">
        <p className="lmp-caption m-0">Upcoming Deliveries</p>
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F0F5F2] text-[#2E5B44]">
          <CalendarDays size={15} strokeWidth={1.8} />
        </span>
      </div>

      {deliveries.length === 0 ? (
        <p className="text-sm text-[#526058] m-0" data-testid="schedule-empty-state">
          No upcoming deliveries scheduled yet. Your meal schedule will appear here once your subscription is active.
        </p>
      ) : (
        <div className="space-y-3 lmp-stagger">
          {deliveries.map((d) => (
            <DeliveryRow
              key={d.id}
              delivery={d}
              isToday={d.scheduled_date === today}
              onSkip={setPendingSkip}
              skipping={skipping}
            />
          ))}
        </div>
      )}

      {pendingSkip && (
        <div className="lmp-overlay fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(26,36,32,0.35)', backdropFilter: 'blur(4px)' }} onClick={() => !skipping && setPendingSkip(null)}>
          <div
            className="lmp-modal bg-white rounded-2xl border border-[#E5E2DA] shadow-2xl max-w-md w-full p-6"
            data-testid="confirm-pause-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight text-[#1A2420] mt-0 mb-2">Skip this delivery?</h3>
            <p className="text-sm text-[#526058] mb-6 m-0">
              {fmtDay(pendingSkip.scheduled_date)} — your meal credit is preserved and your plan extends by one day.
            </p>
            <div className="flex justify-end gap-3">
              <button data-testid="skip-cancel-button" className="lmp-btn-secondary" disabled={skipping} onClick={() => setPendingSkip(null)}>
                Keep meal
              </button>
              <button data-testid="skip-confirm-button" className="lmp-btn-primary" disabled={skipping} onClick={confirmSkip}>
                {skipping ? 'Skipping…' : 'Yes, skip day'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
