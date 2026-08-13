import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString } from '../lib/date'
import Alert from '../components/Alert'

export default function DriverMode() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'completed'

  useEffect(() => {
    fetchDeliveries()
  }, [])

  async function fetchDeliveries() {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          id,
          status,
          meal_name_snapshot,
          notes,
          meal_slot,
          menu_items ( dietary_type ),
          orders (
            order_type,
            customers ( name, contact, address, latitude, longitude )
          )
        `)
        .eq('scheduled_date', todayDateString())
        .order('id')

      if (error) throw error
      setDeliveries(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(delivery, newStatus) {
    const isSubscription = delivery.orders?.order_type === 'subscription'

    if (newStatus === 'missed') {
      const confirmed = window.confirm('Are you sure you want to mark this as missed?')
      if (!confirmed) return
    }

    setUpdatingId(delivery.id)
    setError('')

    try {
      if (newStatus === 'missed' && isSubscription) {
        const res = await supabase.rpc('skip_delivery_and_extend', {
          p_delivery_id: delivery.id,
          p_skip_reason: 'Driver marked as missed on route',
        })
        if (res.error) throw res.error
      } else {
        const res = await supabase
          .from('deliveries')
          .update({ status: newStatus })
          .eq('id', delivery.id)
        if (res.error) throw res.error
      }
      
      await fetchDeliveries()
    } catch (err) {
      setError(`Failed to update: ${err.message}`)
    } finally {
      setUpdatingId(null)
    }
  }

  function getDirectionsLink(customer) {
    if (customer.latitude && customer.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${customer.latitude},${customer.longitude}`
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`
  }

  const pendingDeliveries = deliveries.filter(d => d.status === 'pending')
  const completedDeliveries = deliveries.filter(d => d.status !== 'pending')
  const currentList = activeTab === 'pending' ? pendingDeliveries : completedDeliveries

  if (loading) return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600 mb-4"></div>
      <p className="text-slate-500 font-medium animate-pulse">Syncing route data...</p>
    </div>
  )

  return (
    // fixed inset-0 z-[9999] completely covers the admin navbar
    <div className="fixed inset-0 z-[9999] bg-slate-50 overflow-y-auto font-sans pb-24">
      
      {/* Modern Gradient Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-emerald-800 to-emerald-600 text-white px-5 py-4 shadow-md">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Driver Hub</h1>
            <p className="text-emerald-100 text-xs font-medium opacity-90 mt-0.5">{todayDateString()}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-inner">
            <span className="text-sm font-bold tracking-wide">{pendingDeliveries.length} Left</span>
          </div>
        </div>
      </header>

      {/* iOS Style Segmented Control Tabs */}
      <div className="max-w-lg mx-auto w-full px-4 pt-5 pb-2">
        <div className="flex p-1 bg-slate-200/80 rounded-xl shadow-inner">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ease-out ${
              activeTab === 'pending' 
              ? 'bg-white text-emerald-800 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] scale-100' 
              : 'text-slate-500 hover:text-slate-700 scale-95 opacity-80'
            }`}
          >
            Pending ({pendingDeliveries.length})
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ease-out ${
              activeTab === 'completed' 
              ? 'bg-white text-emerald-800 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] scale-100' 
              : 'text-slate-500 hover:text-slate-700 scale-95 opacity-80'
            }`}
          >
            Completed ({completedDeliveries.length})
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4 max-w-lg mx-auto mt-2">
        <Alert type="error" message={error} onClose={() => setError('')} />

        {currentList.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mt-6 transition-all">
            <div className="text-5xl mb-4 transform hover:scale-110 transition-transform duration-300">🎉</div>
            <p className="text-slate-800 font-bold text-lg">
              {activeTab === 'pending' ? 'All caught up!' : 'No completed deliveries.'}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {activeTab === 'pending' ? 'Take a break, you earned it.' : 'Check back later.'}
            </p>
          </div>
        ) : (
          currentList.map((d) => {
            const cust = d.orders?.customers || {}
            let type = 'Veg'
            const dt = d.menu_items?.dietary_type
            const name = (d.meal_name_snapshot || '').toLowerCase()
            if (dt === 'non_vegetarian' || name.includes('non-veg') || name.includes('chicken') || name.includes('egg')) type = 'Non-Veg'

            return (
              <div key={d.id} className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300">
                
                {/* Status Bar */}
                <div className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-widest flex justify-between items-center ${
                  d.status === 'pending' 
                    ? 'bg-indigo-50 text-indigo-700 border-b border-indigo-100/50' 
                    : d.status === 'delivered' 
                      ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100/50' 
                      : 'bg-rose-50 text-rose-700 border-b border-rose-100/50'
                }`}>
                  <span>{d.status}</span>
                  <span>{d.meal_slot}</span>
                </div>

                <div className="p-5">
                  {/* Customer Info */}
                  <div className="mb-4">
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{cust.name}</h2>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed font-medium">{cust.address}</p>
                  </div>

                  {/* Meal Details Box */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 mb-5 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full shadow-inner ${type === 'Veg' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      <p className="font-bold text-slate-800 text-sm">{d.meal_name_snapshot}</p>
                    </div>
                    {d.notes && (
                      <div className="mt-2.5 flex items-start gap-2 bg-amber-50/80 p-2 rounded-xl border border-amber-100/50">
                        <span className="text-amber-500 text-sm">⚠️</span>
                        <p className="text-xs font-bold text-amber-800 pt-0.5 leading-relaxed">
                          {d.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons (Call / Navigate) */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <a 
                      href={`tel:${cust.contact}`}
                      className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-2xl text-sm transition-all duration-200 active:scale-95"
                    >
                      <span className="text-lg">📞</span> Call
                    </a>
                    <a 
                      href={getDirectionsLink(cust)}
                      target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3.5 px-4 rounded-2xl text-sm transition-all duration-200 active:scale-95 shadow-sm"
                    >
                      <span className="text-lg">🗺️</span> Navigate
                    </a>
                  </div>

                  {/* Update Status Buttons */}
                  {d.status === 'pending' && (
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                      <button
                        disabled={updatingId === d.id}
                        onClick={() => updateStatus(d, 'missed')}
                        className="col-span-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-4 rounded-2xl text-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
                      >
                        Missed
                      </button>
                      <button
                        disabled={updatingId === d.id}
                        onClick={() => updateStatus(d, 'delivered')}
                        className="col-span-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black py-4 rounded-2xl text-base shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {updatingId === d.id ? 'Saving...' : (
                          <>
                            <span className="text-lg">✓</span> DELIVERED
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
