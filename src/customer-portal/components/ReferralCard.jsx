import { useCallback, useEffect, useState } from 'react'
import { Gift, Copy } from 'lucide-react'
import { toast } from 'sonner'

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export default function ReferralCard({ customer, supabase, hasSubscription }) {
  const [offer, setOffer] = useState(null)
  const [myReferrals, setMyReferrals] = useState([])
  const [appliedCode, setAppliedCode] = useState(null)
  const [code, setCode] = useState('')
  const [applying, setApplying] = useState(false)

  const load = useCallback(async () => {
    const [offerRes, mineRes, appliedRes] = await Promise.all([
      supabase.from('business_settings').select('value').eq('key', 'referral').maybeSingle(),
      supabase.from('referrals').select('*').eq('referrer_customer_id', customer.id).order('created_at', { ascending: false }),
      supabase.from('referrals').select('*').eq('referee_customer_id', customer.id).maybeSingle(),
    ])
    if (!offerRes.error) setOffer(offerRes.data?.value ?? null)
    if (!mineRes.error) setMyReferrals(mineRes.data ?? [])
    if (!appliedRes.error) setAppliedCode(appliedRes.data ?? null)
  }, [customer.id, supabase])

  useEffect(() => {
    load()
  }, [load])

  if (!offer?.active) return null

  const myCode = customer.customer_id_lm
  const reward = offer.reward_meals ?? 1
  const shareUrl = 'https://customer.lunchmate.live'
  const shareText = `I'm on Lunchmate — fresh home-style meals delivered daily in Kakinada. Sign up with my code ${myCode} at ${shareUrl}`

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(myCode)
      toast.success('Referral code copied')
    } catch {
      toast.error('Could not copy — long-press the code to copy it.')
    }
  }

  const applyCode = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setApplying(true)
    try {
      const { error } = await supabase.rpc('apply_referral_code', { p_code: code.trim() })
      if (error) throw error
      toast.success('Referral code applied', { description: 'Your referrer will be credited when your subscription starts.' })
      setCode('')
      await load()
    } catch (err) {
      toast.error(err.message || 'Could not apply this code.')
    } finally {
      setApplying(false)
    }
  }

  const eligibleToApply = !hasSubscription && !appliedCode

  return (
    <section className="lmp-card p-5 sm:p-6" data-testid="referral-section">
      <div className="flex items-center justify-between mb-1.5">
        <p className="lmp-caption m-0">Refer &amp; Earn</p>
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F0F5F2] text-[#2E5B44]">
          <Gift size={15} strokeWidth={1.8} />
        </span>
      </div>
      <p className="text-sm text-[#526058] mb-4 mt-0" data-testid="referral-offer-message">
        {offer.message ?? `Refer a friend — earn ${reward} free meal${reward > 1 ? 's' : ''} when they subscribe.`}
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        <span
          data-testid="referral-code-value"
          className="font-mono text-sm font-semibold tracking-widest bg-[#F3F0EA] border border-[#E5E2DA] rounded-lg px-3.5 py-2 text-[#1A2420]"
        >
          {myCode}
        </span>
        <button type="button" data-testid="referral-copy-button" className="lmp-btn-secondary !min-h-[40px] !py-2 text-xs" onClick={copyCode}>
          <Copy size={13} /> Copy
        </button>
        <a
          data-testid="referral-share-whatsapp"
          className="lmp-btn-primary !min-h-[40px] !py-2 text-xs no-underline"
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on WhatsApp
        </a>
      </div>

      {myReferrals.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#E5E2DA] space-y-2" data-testid="referral-status-list">
          {myReferrals.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm" data-testid={`referral-row-${r.id}`}>
              <span className="text-[#526058]">Friend joined with your code</span>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  r.status === 'successful'
                    ? 'bg-[#F0F5F2] text-[#2E5B44] border-[#DCE8E0]'
                    : 'bg-[#FEF3C7] text-amber-800 border-amber-700/20'
                }`}
              >
                {r.status === 'successful' ? `+${r.reward_meals} meal credited` : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      )}

      {appliedCode && (
        <p className="mt-4 text-xs text-[#808D85] m-0" data-testid="referral-applied-note">
          You joined with code <span className="font-mono font-semibold">{appliedCode.code}</span> ·{' '}
          {appliedCode.status === 'successful' ? 'reward sent to your friend' : 'reward unlocks when your subscription starts'}.
        </p>
      )}

      {eligibleToApply && (
        <form onSubmit={applyCode} className="mt-4 pt-4 border-t border-[#E5E2DA]">
          <label className="lmp-label" htmlFor="referral-code-input">Have a friend&apos;s code?</label>
          <div className="flex gap-2.5">
            <input
              id="referral-code-input"
              data-testid="referral-code-input"
              className="lmp-field font-mono uppercase"
              placeholder="e.g. LM2600029"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={12}
            />
            <button type="submit" data-testid="referral-apply-button" className="lmp-btn-primary shrink-0" disabled={applying || !code.trim()}>
              {applying ? 'Applying…' : 'Apply'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
