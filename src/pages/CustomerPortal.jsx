import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString } from '../lib/date'
import { ChefHat, CalendarDays, MessageSquare, LogOut, ShieldCheck, Sparkles } from 'lucide-react'

// Premium Floating Motifs Background
const FloatingMotifs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[15%] left-[10%] text-4xl animate-bounce opacity-20 duration-[3000ms]">🍃</div>
    <div className="absolute top-[35%] right-[15%] text-4xl animate-pulse opacity-20 duration-[4000ms]">🥕</div>
    <div className="absolute bottom-[25%] left-[20%] text-4xl animate-bounce opacity-20 duration-[3500ms]">🥄</div>
    <div className="absolute bottom-[10%] right-[10%] text-4xl animate-pulse opacity-20 duration-[5000ms]">🍲</div>
  </div>
)

export default function CustomerPortal() {
  const [view, setView] = useState('login') 
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [googleEmail, setGoogleEmail] = useState('')
  
  const [customer, setCustomer] = useState(null)
  const [overview, setOverview] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [feedback, setFeedback] = useState('')

  // --- SUPABASE BACKEND LOGIC ---
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .ilike('contact', `%${phone.trim()}%`)
        .single()
        
      if (custError || !custData) throw new Error('Phone number not found.')

      if (!custData.portal_pin) {
        const { error: updateError } = await supabase.from('customers').update({ portal_pin: pin }).eq('id', custData.id)
        if (updateError) throw updateError
        custData.portal_pin = pin
      } else if (custData.portal_pin !== pin) {
        throw new Error('Incorrect Security PIN.')
      }

      setCustomer(custData)
      if (!custData.google_email) {
        setView('google-sync')
      } else {
        await loadDashboardData(custData.id)
        setView('dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSync(skip = false) {
    setLoading(true)
    try {
      if (!skip && googleEmail) {
        await supabase.from('customers').update({ google_email: googleEmail }).eq('id', customer.id)
      }
      await loadDashboardData(customer.id)
      setView('dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadDashboardData(customerId) {
    const { data: subData } = await supabase
      .from('subscription_overview')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subData) {
      setOverview(subData)
      const { data: timeData } = await supabase
        .from('subscription_delivery_timeline')
        .select('*')
        .eq('subscription_order_id', subData.subscription_order_id)
        .order('scheduled_date', { ascending: true })
      setTimeline(timeData || [])
    }
  }

  async function handleSkip(delivery) {
    const today = todayDateString()
    if (delivery.scheduled_date <= today) {
      alert("You cannot skip a meal scheduled for today. Preparation has already begun!")
      return
    }
    if (!window.confirm(`Skip your meal on ${delivery.scheduled_date}? Your plan will extend by one day.`)) return

    setLoading(true)
    try {
      const { error } = await supabase.rpc('skip_delivery_and_extend', {
        p_delivery_id: delivery.delivery_id,
        p_skip_reason: 'Skipped via Customer Portal',
      })
      if (error) throw error
      await loadDashboardData(customer.id)
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFeedback(e) {
    e.preventDefault()
    if (!feedback.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase.from('customer_feedback').insert([{
        customer_id: customer.id,
        customer_name: customer.name,
        message: feedback
      }])
      if (error) throw error
      setSuccess('Message whispered to the chef! 🌿')
      setFeedback('')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- GLOBAL STYLES ---
  const glassStyle = "bg-emerald-950/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
  const glossyBtn = "bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border border-emerald-400/30 backdrop-blur-md shadow-[0_4px_12px_rgba(16,185,129,0.2)]"

  const bgWrapper = {
    backgroundImage: "radial-gradient(1200px 600px at 10% -10%, rgba(16,185,129,0.20), transparent 60%), radial-gradient(900px 500px at 100% 10%, rgba(245,158,11,0.12), transparent 60%), radial-gradient(1000px 700px at 50% 120%, rgba(6,78,59,0.55), transparent 60%), linear-gradient(160deg, #022c22 0%, #041312 45%, #020617 100%)"
  }

  // --- VIEW 1: PREMIUM LOGIN ---
  if (view === 'login') {
    return (
      <div className="fixed inset-0 z-[9999] w-full flex items-center justify-center p-5 font-sans overflow-hidden text-emerald-50" style={bgWrapper}>
        <FloatingMotifs />
        <div className="w-full max-w-md relative z-10">
          
          <div className="flex items-center justify-center gap-3 mb-8 select-none">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${glossyBtn}`}>
              <ChefHat className="h-7 w-7 text-emerald-50" strokeWidth={2.2} />
            </div>
            <div className="text-left">
              <div className="text-3xl font-extrabold tracking-tight text-emerald-50">Lunchmate</div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300/80">Farm-fresh · Daily</div>
            </div>
          </div>

          <div className={`${glassStyle} p-8 rounded-[2rem] relative`}>
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold tracking-tight text-emerald-50 leading-tight">Welcome back.</h1>
              <p className="text-sm text-emerald-100/70 mt-1.5">Sign in securely to manage today's meal, skip any day, and whisper notes to the chef.</p>
            </div>

            {error && <div className="bg-rose-500/20 border border-rose-500/30 text-rose-200 p-3 rounded-xl text-sm mb-5 font-bold text-center">{error}</div>}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-emerald-300/70 uppercase tracking-wider mb-2 ml-1">Phone Number</label>
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-4 text-emerald-50 placeholder-emerald-100/30 focus:bg-black/40 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all" placeholder="Enter your number" />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-emerald-300/70 uppercase tracking-wider mb-2 ml-1">4-Digit Security PIN</label>
                <input required type="password" maxLength="4" value={pin} onChange={e => setPin(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-4 text-emerald-50 text-center tracking-[1.5em] font-black focus:bg-black/40 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all" placeholder="••••" />
              </div>

              <button type="submit" disabled={loading} className="w-full h-14 mt-4 rounded-2xl bg-white text-emerald-950 font-bold text-[15px] shadow-[0_10px_30px_rgba(255,255,255,0.15)] hover:shadow-[0_15px_40px_rgba(255,255,255,0.25)] active:scale-95 transition-all duration-300">
                {loading ? 'Verifying...' : 'Secure Login'}
              </button>
            </form>

            <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-white/10">
              <div className="bg-white/5 rounded-xl py-3 text-center">
                <ShieldCheck className="h-4 w-4 mx-auto text-emerald-300 mb-1" />
                <div className="text-[10px] uppercase tracking-widest text-emerald-200/70">256-Bit Encrypted</div>
              </div>
              <div className="bg-white/5 rounded-xl py-3 text-center">
                <Sparkles className="h-4 w-4 mx-auto text-amber-300 mb-1" />
                <div className="text-[10px] uppercase tracking-widest text-emerald-200/70">Secure Session</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- VIEW 2: GOOGLE SYNC UI ---
  if (view === 'google-sync') {
    return (
      <div className="fixed inset-0 z-[9999] w-full flex items-center justify-center p-5 font-sans overflow-hidden text-emerald-50" style={bgWrapper}>
        <FloatingMotifs />
        <div className={`${glassStyle} w-full max-w-md p-10 rounded-[2rem] text-center relative z-10`}>
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-[2rem] mb-6 ${glossyBtn}`}>
             <span className="text-4xl">✉️</span>
          </div>
          <h2 className="text-2xl font-black mb-3">Sync Your Email</h2>
          <p className="text-emerald-100/70 text-sm mb-8 font-medium">Receive digital PDF invoices and live menu tracking links straight to your inbox.</p>
          
          <input type="email" value={googleEmail} onChange={e => setGoogleEmail(e.target.value)} placeholder="yourname@gmail.com" className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-4 mb-6 focus:ring-2 focus:ring-blue-500/50 outline-none text-center font-medium transition-all" />
          
          <button onClick={() => handleGoogleSync(false)} disabled={!googleEmail || loading} className="w-full bg-white text-emerald-950 font-black py-4 rounded-2xl active:scale-95 disabled:opacity-50 mb-4 transition-all">
            Connect & Continue
          </button>
          
          <button onClick={() => handleGoogleSync(true)} className="text-emerald-400/70 hover:text-emerald-300 font-bold text-sm transition-colors">
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  // --- VIEW 3: PREMIUM DASHBOARD ---
  const pendingDeliveries = timeline.filter(d => d.status === 'pending')

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans text-emerald-50 pb-20" style={bgWrapper}>
      <FloatingMotifs />
      
      <div className="max-w-3xl mx-auto p-4 space-y-6 pt-6 relative z-10">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${glossyBtn}`}>
                <span className="font-black text-xl text-emerald-50">{customer?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="leading-tight">
                <div className="text-[17px] font-bold text-emerald-50">
                  Hi, {customer?.name?.split(" ")[0]} <span className="text-amber-300">👋</span>
                </div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/70 mt-1">
                  Lunchmate · Portal
                </div>
              </div>
          </div>
          <button onClick={() => { setCustomer(null); setView('login') }} className={`p-3 rounded-xl text-emerald-100 hover:text-white transition-colors ${glossyBtn} border-none`}>
            <LogOut size={18} />
          </button>
        </div>

        {/* Credits Glass Card */}
        {overview && (
          <div className={`${glassStyle} p-7 rounded-[2rem] relative overflow-hidden`}>
            <div className="absolute -top-10 -right-10 text-9xl opacity-5">🍲</div>
            <p className="text-emerald-300/80 text-xs font-bold uppercase tracking-[0.2em] mb-2">Available Credits</p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-white">{overview.credits_remaining}</span>
              <span className="text-xl text-emerald-200/50 font-bold">/ {overview.plan_credits} meals</span>
            </div>
            
            <div className="mt-6 pt-5 border-t border-white/10 flex justify-between text-sm font-medium">
              <span className="text-emerald-100/70">Total: ₹{overview.revised_total_amount}</span>
              <span className="text-emerald-100/70">Balance: <span className={overview.amount_due > 0 ? "text-amber-300 font-bold" : "text-emerald-300 font-bold"}>₹{overview.amount_due}</span></span>
            </div>
          </div>
        )}

        {/* Schedule */}
        <div className="space-y-3">
          <h3 className="text-emerald-100/60 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-4 px-1">
            <CalendarDays size={14} /> Upcoming Deliveries
          </h3>
          
          {pendingDeliveries.length === 0 ? (
            <div className={`${glassStyle} p-8 rounded-3xl text-center`}>
              <p className="text-3xl mb-2">✨</p>
              <p className="font-bold text-emerald-100/70">Your schedule is empty.</p>
            </div>
          ) : (
            pendingDeliveries.slice(0, 5).map(d => {
              const isToday = d.scheduled_date === todayDateString()
              const isPast = d.scheduled_date < todayDateString()
              const canSkip = !isToday && !isPast

              return (
                <div key={d.id} className="bg-emerald-950/30 backdrop-blur-md p-4 rounded-2xl flex justify-between items-center border border-white/5 hover:bg-emerald-950/50 transition-all">
                  <div>
                    <p className={`font-bold ${isToday ? 'text-amber-300' : 'text-emerald-50'}`}>
                      {d.scheduled_date} {isToday && <span className="ml-2 text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Today</span>}
                    </p>
                    <p className="text-xs text-emerald-300/60 mt-1 font-medium">{d.meal_name_snapshot}</p>
                  </div>
                  <div>
                    {canSkip ? (
                      <button onClick={() => handleSkip(d)} disabled={loading} className={`text-[11px] font-bold px-4 py-2 rounded-xl text-emerald-50 active:scale-95 transition-all ${glossyBtn}`}>
                        Pause Day
                      </button>
                    ) : (
                      <div className="text-[10px] uppercase tracking-widest text-emerald-100/40 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-1.5">
                        {isToday ? <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Preparing</> : '🔒 Locked'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Feedback Form */}
        <form onSubmit={handleFeedback} className={`${glassStyle} p-7 rounded-[2rem]`}>
          <h3 className="text-emerald-50 font-semibold flex items-center gap-2 mb-4">
            <MessageSquare size={16} /> Whisper to Chef
          </h3>
          {success && <div className="bg-emerald-500/20 text-emerald-300 p-3 rounded-xl text-xs font-bold mb-4 text-center animate-pulse">{success}</div>}
          <textarea
            required
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-emerald-50 text-sm placeholder:text-emerald-300/40 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all mb-4 resize-none"
            placeholder="Less spice, extra salad, traveling tomorrow..."
            rows={3}
          />
          <button disabled={loading} className="w-full bg-white hover:bg-emerald-50 text-emerald-950 font-bold py-3.5 rounded-2xl transition-all active:scale-95 shadow-[0_10px_20px_rgba(255,255,255,0.1)]">
            {loading ? "Whispering..." : "Send Message"}
          </button>
        </form>

      </div>
    </div>
  )
}
