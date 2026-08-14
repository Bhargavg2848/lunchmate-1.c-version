import { useState } from 'react'
import { CalendarDays, CookingPot, SkipForward, X } from 'lucide-react'
import { toast } from 'sonner'

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fmtDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

const fmtDayLong = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

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

function DeliveryRow({ delivery, isToday, onOpen }) {
  const status = statusDisplay(delivery, isToday)
  const mealText =
    delivery.status === 'missed' && delivery.skip_reason
      ? 'Meal skipped — credit preserved'
      : delivery.meal_name_snapshot ?? 'Meal to be announced'

  return (
    <button
      type="button"
      onClick={() => onOpen(delivery)}
      data-testid={isToday ? 'delivery-card-today' : `delivery-card-${delivery.scheduled_date}-${delivery.meal_slot ?? 'meal'}`}
      className={`w-full text-left flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border p-4 transition-all duration-300 ease-out cursor-pointer active:scale-[0.99] ${
        isToday
          ? 'border-[#2E5B44]/25 bg-[#F0F5F2]/60 hover:border-[#2E5B44]/40'
          : 'border-[#E5E2DA] bg-white/70 hover:border-[#D8D2C6] hover:shadow-[0_4px_14px_-4px_rgba(30,58,43,0.1)]'
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
        <span className="text-[#A8B3AC] text-xs hidden sm:inline">Tap for details</span>
      </div>
    </button>
  )
}

export default function ScheduleCard({ deliveries, skipDelivery }) {
  const [selected, setSelected] = useState(null)
  const [confirmingSkip, setConfirmingSkip] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const today = todayISO()

  const canSkip = (d) => d && d.status === 'pending' && d.scheduled_date > today

  const confirmSkip = async () => {
    if (!selected) return
    setSkipping(true)
    try {
      await skipDelivery(selected)
      toast.success('Meal skipped', { description: 'Your credit has been preserved — your plan extends by a day.' })
      setSelected(null)
      setConfirmingSkip(false)
    } catch {
      toast.error("We couldn't skip this meal. Please try again.")
    } finally {
      setSkipping(false)
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
            <DeliveryRow key={d.id} delivery={d} isToday={d.scheduled_date === today} onOpen={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <div
          className="lmp-overlay fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(26,36,32,0.35)', backdropFilter: 'blur(4px)' }}
          onClick={() => !skipping && (setSelected(null), setConfirmingSkip(false))}
        >
          <div
            className="lmp-modal bg-white rounded-2xl border border-[#E5E2DA] shadow-2xl max-w-md w-full p-6"
            data-testid="delivery-detail-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[#1A2420] m-0" data-testid="delivery-detail-date">
                  {selected.scheduled_date === today ? 'Today' : fmtDayLong(selected.scheduled_date)}
                </h3>
                <p className="text-xs text-[#808D85] mt-1 capitalize m-0">{selected.meal_slot ?? 'meal'} delivery</p>
              </div>
              <button
                data-testid="delivery-detail-close"
                className="lmp-btn-ghost !min-h-[36px] !px-2"
                onClick={() => (setSelected(null), setConfirmingSkip(false))}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-[#FAF8F5] border border-[#E5E2DA] rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-[#1A2420] m-0" data-testid="delivery-detail-meal">
                {selected.meal_name_snapshot ?? 'Meal to be announced'}
              </p>
              <div className="mt-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusDisplay(selected, selected.scheduled_date === today).cls}`} data-testid="delivery-detail-status">
                  {statusDisplay(selected, selected.scheduled_date === today).label}
                </span>
              </div>
              {selected.notes && (
                <p className="text-xs text-amber-800 bg-[#FEF3C7]/70 border border-amber-700/10 rounded-lg p-2.5 mt-3 mb-0">
                  Kitchen note: {selected.notes}
                </p>
              )}
              {selected.skip_reason && (
                <p className="text-xs text-[#808D85] mt-3 mb-0">Skipped — your credit was preserved and moved to the end of your plan.</p>
              )}
            </div>

            {canSkip(selected) && !confirmingSkip && (
              <button
                data-testid={`delivery-skip-button-${selected.id}`}
                className="lmp-btn-amber w-full"
                onClick={() => setConfirmingSkip(true)}
              >
                <SkipForward size={13} /> Skip this day
              </button>
            )}

            {canSkip(selected) && confirmingSkip && (
              <div data-testid="confirm-pause-dialog" className="border border-amber-700/20 bg-amber-700/5 rounded-xl p-4">
                <p className="text-sm text-[#1A2420] font-medium mt-0 mb-1">Skip this delivery?</p>
                <p className="text-xs text-[#526058] mb-4 m-0">Your meal credit is preserved and your plan extends by one day.</p>
                <div className="flex justify-end gap-2.5">
                  <button data-testid="skip-cancel-button" className="lmp-btn-secondary !min-h-[38px] !py-1.5 text-xs" disabled={skipping} onClick={() => setConfirmingSkip(false)}>
                    Keep meal
                  </button>
                  <button data-testid="skip-confirm-button" className="lmp-btn-primary !min-h-[38px] !py-1.5 text-xs" disabled={skipping} onClick={confirmSkip}>
                    {skipping ? 'Skipping…' : 'Yes, skip day'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
