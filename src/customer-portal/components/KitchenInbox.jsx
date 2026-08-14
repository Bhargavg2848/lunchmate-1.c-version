import { useState } from 'react'
import { ChefHat, Send } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = [
  { value: 'dietary', label: 'Dietary note' },
  { value: 'preference', label: 'Meal preference' },
  { value: 'delivery', label: 'Delivery note' },
  { value: 'feedback', label: 'Feedback' },
]

const QUICK_CHIPS = ['Less oil', 'Extra curd', 'Mild spice today', 'Late delivery request']

const fmtTime = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export default function KitchenInbox({ messages, sendKitchenMessage }) {
  const [category, setCategory] = useState('dietary')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    try {
      await sendKitchenMessage({ category, message: message.trim() })
      setMessage('')
      toast.success('Sent to the kitchen ✓', { description: 'Our chefs will see your note before the next meal.' })
    } catch {
      toast.error("We couldn't send your note. Please try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="lmp-card p-5 sm:p-6" data-testid="kitchen-inbox-section">
      <div className="flex items-center justify-between mb-1.5">
        <p className="lmp-caption m-0">Kitchen Inbox</p>
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F0F5F2] text-[#2E5B44]">
          <ChefHat size={15} strokeWidth={1.8} />
        </span>
      </div>
      <p className="text-sm text-[#526058] mb-4 mt-0">
        Send dietary notes, preferences and feedback straight to our Kakinada kitchen.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Message category">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              data-testid={`kitchen-category-${c.value}`}
              onClick={() => setCategory(c.value)}
              className={`text-xs font-medium px-3 py-1.5 min-h-[36px] rounded-full border transition-all duration-150 active:scale-95 cursor-pointer ${
                category === c.value
                  ? 'bg-[#1E3A2B] text-white border-[#1E3A2B]'
                  : 'bg-white text-[#526058] border-[#E5E2DA] hover:border-[#CFC8BA]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <textarea
          data-testid="kitchen-inbox-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="E.g. Please add extra chutney for tomorrow's lunch…"
          rows={3}
          maxLength={1000}
          className="lmp-field resize-none"
        />

        <div className="flex flex-wrap items-center gap-2">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              data-testid={`kitchen-chip-${chip.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              onClick={() => setMessage((m) => (m ? `${m} ${chip}.` : `${chip}.`))}
              className="text-[11px] text-[#526058] bg-[#F3F0EA] hover:bg-[#EAE5DC] rounded-full px-2.5 py-1 transition-colors duration-150 border-none cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        <button
          type="submit"
          data-testid="kitchen-inbox-submit-button"
          className="lmp-btn-primary"
          disabled={sending || !message.trim()}
        >
          <Send size={14} /> {sending ? 'Sending…' : 'Send to Kitchen'}
        </button>
      </form>

      {messages.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[#E5E2DA] space-y-2" data-testid="kitchen-recent-messages">
          <p className="lmp-caption">Recent notes</p>
          {messages.slice(0, 3).map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-3 text-sm" data-testid={`kitchen-message-${m.id}`}>
              <p className="text-[#526058] truncate flex-1 m-0">{m.message}</p>
              <span className="shrink-0 text-[11px] text-[#808D85] capitalize">
                {fmtTime(m.created_at)} · {m.is_read ? 'read' : 'sent'}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
