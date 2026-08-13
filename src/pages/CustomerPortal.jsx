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
        
      if (custError || !custData) throw new Error('Phone number not found in our system.')

      if (!custData.portal_pin) {
        const { error: updateError } = await supabase.from('customers').update({ portal_pin: pin }).eq('id', custData.id)
        if (updateError) throw updateError
        custData.portal_pin = pin
      } else {
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
      setSuccess('Message sent to the Lunchmate team!')
      setFeedbackMsg('')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- VIEW 1: PREMIUM GLASSMORPHISM LOGIN ---
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-149883716733f-56516d7083f0?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-orange-900/40 backdrop-blur-sm"></div>
        
        <div className="card w-full max-w-md glass shadow-2xl z-10 text-neutral-content">
          <div className="card-body">
            <h2 className="card-title text-3xl font-black text-white justify-center mb-1">Lunchmate</h2>
            <p className="text-center text-orange-100 font-medium text-sm mb-6">Customer Portal</p>
            
            {error && <div className="alert alert-error shadow-lg py-2 rounded-xl mb-4"><span className="text-sm font-bold text-white">{error}</span></div>}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text text-orange-50 font-bold">Registered Phone Number</span></label>
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input input-bordered input-lg w-full bg-white/20 text-white placeholder-white/60 border-white/30 focus:border-white focus:ring-0 transition-all" placeholder="Enter phone number" />
              </div>
              
              <div className="form-control">
                <label className="label"><span className="label-text text-orange-50 font-bold">4-Digit Security PIN</span></label>
                <input required type="password" maxLength="4" value={pin} onChange={e => setPin(e.target.value)} className="input input-bordered input-lg w-full bg-white/20 text-white placeholder-white/60 border-white/30 text-center tracking-[1em] font-black focus:border-white focus:ring-0 transition-all" placeholder="••••" />
                <label className="label"><span className="label-text-alt text-orange-100/70 text-xs text-center w-full mt-2">First time logging in? Your PIN will be automatically saved.</span></label>
              </div>
              
              <div className="form-control mt-4">
                <button type="submit" disabled={loading} className="btn btn-primary border-none bg-orange-500 hover:bg-orange-600 text-white w-full rounded-xl shadow-lg">
                  {loading ? <span className="loading loading-spinner"></span> : 'Secure Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // --- VIEW 2: GOOGLE SYNC UI ---
  if (view === 'google-sync') {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4" data-theme="corporate">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <div className="avatar placeholder mb-4">
              <div className="bg-primary text-primary-content rounded-full w-16 shadow-md">
                <span className="text-2xl">✉️</span>
              </div>
            </div>
            <h2 className="card-title text-2xl font-black">Link Your Email</h2>
            <p className="text-base-content/70 text-sm mb-6">Receive digital invoices, menu updates, and delivery alerts straight to your inbox.</p>
            
            <input type="email" value={googleEmail} onChange={e => setGoogleEmail(e.target.value)} placeholder="name@gmail.com" className="input input-bordered w-full mb-4 text-center" />
            
            <button onClick={() => handleGoogleSync(false)} disabled={!googleEmail || loading} className="btn btn-primary w-full shadow-md mb-3">
              Connect Account
            </button>
            <button onClick={() => handleGoogleSync(true)} className="btn btn-ghost btn-sm text-base-content/50 hover:text-base-content">
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- VIEW 3: PREMIUM DASHBOARD (CORPORATE THEME) ---
  const pendingDeliveries = timeline.filter(d => d.status === 'pending')

  return (
    <div className="min-h-screen bg-base-200 pb-12" data-theme="corporate">
      {/* Navbar UI */}
      <div className="navbar bg-base-100 shadow-sm sticky top-0 z-50">
        <div className="flex-1">
          <a className="btn btn-ghost normal-case text-xl font-black">Lunchmate</a>
        </div>
        <div className="flex-none">
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder">
              <div className="bg-neutral text-neutral-content rounded-full w-10">
                <span>{customer?.name?.charAt(0).toUpperCase()}</span>
              </div>
            </label>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
              <li><button onClick={() => { setCustomer(null); setView('login') }} className="text-error font-bold">Logout</button></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6 mt-4">
        
        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl font-bold text-base-content">Hi, {customer?.name.split(' ')[0]} 👋</h2>
          <p className="text-base-content/60 font-medium">{overview?.plan_name || 'No Active Plan'}</p>
        </div>

        {/* Third-Party Stats Component for Credits & Invoice */}
        {overview && (
          <div className="stats shadow w-full bg-base-100 border border-base-200">
            <div className="stat">
              <div className="stat-figure text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <div className="stat-title font-bold">Meals Remaining</div>
              <div className="stat-value text-primary">{overview.credits_remaining} <span className="text-xl text-base-content/30">/ {overview.plan_credits}</span></div>
              <div className="stat-desc font-medium mt-1 text-base-content/60">Enjoy your home-cooked food!</div>
            </div>
            
            <div className="stat">
              <div className="stat-figure text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
              </div>
              <div className="stat-title font-bold">Balance Due</div>
              <div className={`stat-value ${overview.amount_due > 0 ? 'text-error' : 'text-success'}`}>₹{overview.amount_due}</div>
              <div className="stat-desc font-medium mt-1 text-base-content/60">Total Cost: ₹{overview.revised_total_amount}</div>
            </div>
          </div>
        )}

        {/* Third-Party List Layout for Deliveries */}
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body p-6">
            <h2 className="card-title text-lg mb-2">Upcoming Schedule</h2>
            
            {pendingDeliveries.length === 0 ? (
              <div className="alert shadow-sm bg-base-200/50 justify-center">Your schedule is empty.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <tbody>
                    {pendingDeliveries.slice(0, 5).map(d => {
                      const isToday = d.scheduled_date === todayDateString()
                      const isPast = d.scheduled_date < todayDateString()
                      const canSkip = !isToday && !isPast

                      return (
                        <tr key={d.id} className="hover">
                          <td>
                            <div className="font-bold">{d.scheduled_date}</div>
                            <div className="text-sm opacity-60">{d.meal_name_snapshot}</div>
                          </td>
                          <td className="text-right">
                            {canSkip ? (
                              <button onClick={() => handleCustomerSkip(d)} disabled={loading} className="btn btn-outline btn-warning btn-sm shadow-sm rounded-full px-4">
                                Pause Day
                              </button>
                            ) : (
                              <div className="badge badge-neutral badge-outline font-bold py-3 px-3 shadow-sm">
                                {isToday ? 'Preparing 🍳' : 'Locked 🔒'}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Third-Party Feedback Form Layout */}
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body p-6">
            <h2 className="card-title text-lg mb-1">Kitchen Inbox</h2>
            <p className="text-sm text-base-content/60 mb-4">Leave feedback, dietary notes, or delivery instructions.</p>
            
            {success && <div className="alert alert-success shadow-md py-2 mb-4 text-white font-bold"><span>{success}</span></div>}
            
            <form onSubmit={sendFeedback}>
              <textarea 
                required
                value={feedbackMsg}
                onChange={e => setFeedbackMsg(e.target.value)}
                className="textarea textarea-bordered w-full mb-4 bg-base-200/50 focus:bg-base-100" 
                rows="3"
                placeholder="Ex: Please add less spice tomorrow..."
              ></textarea>
              <button type="submit" disabled={loading} className="btn btn-secondary w-full shadow-md">
                {loading ? <span className="loading loading-dots"></span> : 'Send to Kitchen'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
