import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString } from '../lib/date'

export default function CustomerPortal() {
  const [view, setView] = useState('login') // 'login', 'google-sync', 'dashboard'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Auth State
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [googleEmail, setGoogleEmail] = useState('')
  
  // Data State
  const [customer, setCustomer] = useState(null)
  const [overview, setOverview] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [feedbackMsg, setFeedbackMsg] = useState('')

  // --- AUTH LOGIC ---
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      // Find customer by phone
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .ilike('contact', `%${phone.trim()}%`)
        .single()
        
      if (custError || !custData) throw new Error('Phone number not found in our system.')

      if (!custData.portal_pin) {
        // First time login - set PIN
        const { error: updateError } = await supabase.from('customers').update({ portal_pin: pin }).eq('id', custData.id)
        if (updateError) throw updateError
        custData.portal_pin = pin
      } else {
        // Existing user - verify PIN
        if (custData.portal_pin !== pin) throw new Error('Incorrect PIN code.')
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

  // --- DASHBOARD LOGIC ---
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

    if (!window.confirm(`Skip your meal on ${delivery.scheduled_date}? Your plan will be extended by one day.`)) return

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
      setSuccess('Message sent to the Lunchmate team!')
      setFeedbackMsg('')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- RENDER VIEWS ---
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Lunchmate</h1>
            <p className="text-gray-500 font-medium mt-1">Customer Portal</p>
          </div>
          {error && <p className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 font-medium text-center">{error}</p>}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Registered Phone Number</label>
              <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all" placeholder="Enter phone number" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">4-Digit Security PIN</label>
              <input required type="password" maxLength="4" value={pin} onChange={e => setPin(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-center tracking-[1em] font-black focus:ring-2 focus:ring-orange-500 outline-none transition-all" placeholder="••••" />
              <p className="text-xs text-gray-400 mt-2 text-center">If this is your first time, the PIN you enter will be saved as your new password.</p>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-2xl shadow-[0_4px_14px_0_rgba(234,88,12,0.39)] transition-all active:scale-95 disabled:opacity-50">
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (view === 'google-sync') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 w-full max-w-md text-center">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl">🔗</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Connect Your Account</h2>
          <p className="text-gray-500 text-sm mb-6">Link your email to receive beautiful digital invoices and instant meal updates directly to your inbox.</p>
          
          <input type="email" value={googleEmail} onChange={e => setGoogleEmail(e.target.value)} placeholder="Enter your email address" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none text-center" />
          
          <button onClick={() => handleGoogleSync(false)} disabled={!googleEmail || loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-all active:scale-95 disabled:opacity-50 mb-4">
            Connect & Continue
          </button>
          
          <button onClick={() => handleGoogleSync(true)} className="text-gray-400 hover:text-gray-600 font-medium text-sm transition-colors">
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  const pendingDeliveries = timeline.filter(d => d.status === 'pending')

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* Header */}
      <div className="bg-white px-6 py-5 shadow-sm border-b border-gray-100 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-black text-gray-900">Hi, {customer?.name.split(' ')[0]} 👋</h1>
          <p className="text-sm text-gray-500 font-medium">{overview?.plan_name || 'No Active Plan'}</p>
        </div>
        <button onClick={() => { setCustomer(null); setView('login') }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
          Log Out
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6 mt-4">
        
        {/* Credit Card */}
        {overview && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl font-black">🍲</div>
            <p className="text-slate-400 font-medium text-sm uppercase tracking-widest mb-1">Available Credits</p>
            <div className="flex items-end gap-2">
              <span className="text-6xl font-black">{overview.credits_remaining}</span>
              <span className="text-xl text-slate-400 font-bold mb-2">/ {overview.plan_credits}</span>
            </div>
            
            <div className="mt-6 pt-5 border-t border-slate-700/50 flex justify-between items-center">
               <div>
                  <p className="text-xs text-slate-400">Total Amount</p>
                  <p className="font-bold">Rs. {overview.revised_total_amount}</p>
               </div>
               <div className="text-right">
                  <p className="text-xs text-slate-400">Balance Due</p>
                  <p className={`font-bold ${overview.amount_due > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    Rs. {overview.amount_due}
                  </p>
               </div>
            </div>
          </div>
        )}

        {/* Up Next Schedule */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 px-1">Upcoming Deliveries</h2>
          {pendingDeliveries.length === 0 ? (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center text-gray-500 shadow-sm">
              Your schedule is empty. 
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDeliveries.slice(0, 5).map(d => {
                const isToday = d.scheduled_date === todayDateString()
                const isPast = d.scheduled_date < todayDateString()
                const canSkip = !isToday && !isPast

                return (
                  <div key={d.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex justify-between items-center group hover:border-gray-200 transition-colors">
                    <div>
                      <p className="font-bold text-gray-900">{d.scheduled_date}</p>
                      <p className="text-sm text-gray-500">{d.meal_name_snapshot}</p>
                    </div>
                    <div>
                      {canSkip ? (
                        <button 
                          onClick={() => handleCustomerSkip(d)}
                          disabled={loading}
                          className="bg-orange-50 hover:bg-orange-100 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                        >
                          Pause/Skip
                        </button>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                          🔒 {isToday ? 'Preparing' : 'Locked'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Message Kitchen</h2>
          <p className="text-sm text-gray-500 mb-4">Need less spice tomorrow? Traveling soon? Let us know.</p>
          
          {success && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm font-bold mb-4">{success}</div>}
          
          <form onSubmit={sendFeedback}>
            <textarea 
              required
              value={feedbackMsg}
              onChange={e => setFeedbackMsg(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all mb-3" 
              rows="3"
              placeholder="Type your instructions here..."
            ></textarea>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
            >
              Send Message
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
