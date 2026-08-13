import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ExpiringAlerts() {
  const [expiring, setExpiring] = useState([])
  const [loading, setLoading] = useState(true)
  const [notifying, setNotifying] = useState(null)

  useEffect(() => {
    fetchExpiring()
  }, [])

  async function fetchExpiring() {
    setLoading(true)
    const { data, error } = await supabase
      .from('subscription_orders')
      .select(`
        order_id,
        plan_name,
        start_date,
        plan_credits,
        status,
        customers (
          name,
          contact,
          email
        )
      `)
      .eq('status', 'active')
      
    if (data) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const expiringSoon = data.filter(sub => {
        if (!sub.start_date || !sub.plan_credits) return false
        const start = new Date(sub.start_date)
        const end = new Date(start)
        
        // Calculate end date based on credits provided
        end.setDate(start.getDate() + sub.plan_credits) 
        end.setHours(0, 0, 0, 0)
        
        const diffTime = end - today
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        return diffDays === 3 
      })
      
      setExpiring(expiringSoon)
    }
    setLoading(false)
  }

  async function handleSendEmail(sub) {
    setNotifying(sub.order_id)
    try {
      const res = await fetch('/api/send-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sub.customers.email,
          customerName: sub.customers.name,
          planName: sub.plan_name,
          orderId: sub.order_id
        })
      })
      if (!res.ok) throw new Error('Email failed to send.')
      alert(`Success! Expiry notice emailed to ${sub.customers.email}`)
    } catch (err) {
      alert(err.message)
    }
    setNotifying(null)
  }

  function handleSendWhatsApp(sub) {
    // Strip special characters and ensure Indian country code
    const phone = sub.customers.contact.replace(/\D/g, '')
    const finalPhone = phone.length === 10 ? `91${phone}` : phone
    
    const msg = `Hi ${sub.customers.name}, your Lunchmate subscription for the *${sub.plan_name}* is expiring in exactly 3 days. Please let us know if you would like to renew your plan to continue your home-made food delivery! 🍲`
    
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) return null
  if (expiring.length === 0) return null

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 shadow-sm">
      <h2 className="text-lg font-bold text-orange-800 mb-3 flex items-center gap-2">
        ⚠️ Action Required: Expiring in 3 Days ({expiring.length})
      </h2>
      <div className="space-y-3">
        {expiring.map(sub => (
          <div key={sub.order_id} className="bg-white p-3 rounded border border-orange-100 flex justify-between items-center shadow-sm">
            <div>
              <p className="font-bold text-gray-800 text-sm">
                {sub.customers.name} <span className="text-xs font-normal text-gray-500">({sub.order_id})</span>
              </p>
              <p className="text-xs text-gray-600 mt-0.5">{sub.plan_name}</p>
            </div>
            <div className="flex gap-2">
              {sub.customers.email && (
                <button 
                  onClick={() => handleSendEmail(sub)}
                  disabled={notifying === sub.order_id}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {notifying === sub.order_id ? 'Sending...' : '📧 Send Email'}
                </button>
              )}
              {sub.customers.contact && (
                <button 
                  onClick={() => handleSendWhatsApp(sub)}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                >
                  💬 Send WhatsApp
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
