import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString } from '../lib/date'

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
  const [feedbackMsg, setFeedbackMsg] = useState('')

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
      } else {
        if (custData.portal_pin !== pin) throw new Error('Incorrect PIN.')
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

  async function handleCustomerSkip(delivery) {
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

  async function sendFeedback(e) {
    e.preventDefault()
    if (!feedbackMsg.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase.from('customer_feedback').insert([{
        customer_id: customer.id,
        customer_name: customer.name,
        message: feedbackMsg
      }])
      if (error) throw error
      setSuccess('Message sent to the kitchen!')
      setFeedbackMsg('')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Animated Background Blobs for Premium Feel
  const BackgroundEffects = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-orange-300/20 blur-3xl animate-pulse mix-blend-multiply"></div>
      <div className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-rose-300/20 blur-3xl animate-pulse mix-blend-multiply delay-1000"></div>
    </div>
  )

  // --- VIEW 1: PREMIUM ANIMATED LOGIN ---
  if (view === 'login') {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-50 flex items-center justify-center p-4 font-sans overflow-hidden">
        <BackgroundEffects />
        
        <div className="relative z-10 w-full max-w-md transform transition-all duration-500 ease-out translate-y-0 opacity-100">
          <div className="bg-white/70 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white">
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 text-white text-3xl mb-4 shadow-lg shadow-orange-500/30 transform transition hover:scale-110 hover:rotate-3 duration-300">
                🍱
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Lunchmate</h1>
              <p className="text-slate-500 font-medium mt-1">Customer Portal</p>
            </div>
            
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3.5 rounded-2xl text-sm mb-6 font-bold text-center animate-bounce">
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="group">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-orange-500">Phone Number</label>
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 font-medium focus:bg-white focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300" placeholder="Enter your number" />
              </div>
              
              <div className="group">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-orange-500">Security PIN</label>
                <input required type="password" maxLength="4" value={pin} onChange={e => setPin(e.target.value)} className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl px-5 py-4 text-center tracking-[1.5em] font-black text-slate-800 focus:bg-white focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300" placeholder="••••" />
                <p className="text-[11px] font-semibold text-slate-400 mt-2 text-center">First time? This PIN will be saved for future logins.</p>
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold py-4 rounded-2xl shadow-[0_10px_20px_-10px_rgba(244,63,94,0.5)] hover:shadow-[0_15px_25px_-10px_rgba(244,63,94,0.6)] transform hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.97] active:translate-y-0 disabled:opacity-50">
                  {loading ? 'Authenticating...' : 'Secure Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // --- VIEW 2: GOOGLE SYNC (Consistent Styling) ---
  if (view === 'google-sync') {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-50 flex items-center justify-center p-4 font-sans overflow-hidden">
        <BackgroundEffects />
        <div className="relative z-10 bg-white/70 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white w-full max-w-md text-center transform transition-all duration-500">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-4xl mb-6 shadow-lg shadow-blue-500/30 transform transition hover:scale-110 duration-300">
            ✉️
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3">Link Your Email</h2>
          <p className="text-slate-500 text-sm mb-8 font-medium leading-relaxed">Receive your digital invoices, live menu updates, and delivery alerts straight to your inbox.</p>
          
          <input type="email" value={googleEmail} onChange={e => setGoogleEmail(e.target.value)} placeholder="name@gmail.com" className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl px-5 py-4 mb-6 focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-center font-medium transition-all duration-300" />
          
          <button onClick={() => handleGoogleSync(false)} disabled={!googleEmail || loading} className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-[0_10px_20px_-10px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.97] disabled:opacity-50 mb-4">
            Connect Account
          </button>
          
          <button onClick={() => handleGoogleSync(true)} className="text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors active:scale-95 inline-block">
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  // --- VIEW 3: PREMIUM DASHBOARD ---
  const pendingDeliveries = timeline.filter(d => d.status === 'pending')

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 overflow-y-auto font-sans pb-16">
      <BackgroundEffects />
      
      {/* Floating Glass Navbar */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-2">
        <div className="bg-white/80 backdrop-blur-xl px-5 py-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex justify-between items-center max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-500/20">
              {customer?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 leading-tight">Hi, {customer?.name.split(' ')[0]}</h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{overview?.plan_name || 'No Active Plan'}</p>
            </div>
          </div>
          <button 
            onClick={() => { setCustomer(null); setView('login') }} 
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto p-4 space-y-6 mt-2">
        
        {/* Dynamic Credit Card */}
        {overview && (
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] text-white relative overflow-hidden transform hover:-translate-y-1 transition-all duration-500">
            <div className="absolute -top-10 -right-10 text-9xl opacity-5 transform rotate-12">🍲</div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
            
            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mb-2">Available Credits</p>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">{overview.credits_remaining}</span>
              <span className="text-2xl text-slate-500 font-bold">/ {overview.plan_credits}</span>
            </div>
            
            <div className="pt-6 border-t border-slate-700/50 flex justify-between items-center relative z-10">
               <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total Plan</p>
                  <p className="font-extrabold text-lg">₹{overview.revised_total_amount}</p>
               </div>
               <div className="text-right">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Balance Due</p>
                  <p className={`font-extrabold text-lg ${overview.amount_due > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ₹{overview.amount_due}
                  </p>
               </div>
            </div>
          </div>
        )}

        {/* Schedule List */}
        <div>
          <h2 className="text-xl font-black text-slate-800 mb-4 px-2">Upcoming Schedule</h2>
          {pendingDeliveries.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white text-center shadow-sm">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-bold text-slate-600">Your schedule is empty.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDeliveries.slice(0, 5).map(d => {
                const isToday = d.scheduled_date === todayDateString()
                const isPast = d.scheduled_date < todayDateString()
                const canSkip = !isToday && !isPast

                return (
                  <div key={d.id} className="bg-white/80 backdrop-blur-xl p-5 rounded-[1.5rem] border border-white shadow-[0_8px_20px_-10px_rgba(0,0,0,0.05)] flex justify-between items-center group hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
                    <div>
                      <p className={`font-black text-lg ${isToday ? 'text-orange-600' : 'text-slate-800'}`}>
                        {d.scheduled_date} {isToday && <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full ml-2 align-middle">TODAY</span>}
                      </p>
                      <p className="text-sm font-semibold text-slate-500 mt-0.5">{d.meal_name_snapshot}</p>
                    </div>
                    <div>
                      {canSkip ? (
                        <button 
                          onClick={() => handleCustomerSkip(d)}
                          disabled={loading}
                          className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 shadow-sm"
                        >
                          Pause
                        </button>
                      ) : (
                        <div className="bg-slate-50 border border-slate-100 text-slate-400 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          {isToday ? <><span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Preparing</> : '🔒 Locked'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Feedback Card */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💬</span>
            <h2 className="text-xl font-black text-slate-800">Kitchen Inbox</h2>
          </div>
          <p className="text-sm font-semibold text-slate-500 mb-6">Need less spice tomorrow? Traveling soon? Drop a note to the chefs.</p>
          
          {success && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-2xl text-sm font-bold mb-6 text-center animate-pulse">
              {success}
            </div>
          )}
          
          <form onSubmit={sendFeedback}>
            <textarea 
              required
              value={feedbackMsg}
              onChange={e => setFeedbackMsg(e.target.value)}
              className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-300 mb-4 resize-none" 
              rows="3"
              placeholder="Ex: Please add less spice for tomorrow's lunch..."
            ></textarea>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white py-4 rounded-2xl text-sm font-black tracking-wide shadow-[0_10px_20px_-10px_rgba(99,102,241,0.5)] hover:shadow-[0_15px_25px_-10px_rgba(99,102,241,0.6)] transform hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.97] disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
