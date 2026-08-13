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
      // If missed and it's a subscription, trigger the extend RPC so customer doesn't lose credit
      if (newStatus === 'missed' && isSubscription) {
        const res = await supabase.rpc('skip_delivery_and_extend', {
          p_delivery_id: delivery.id,
          p_skip_reason: 'Driver marked as missed on route',
        })
        if (res.error) throw res.error
      } else {
        // Standard status update
        const res = await supabase
          .from('deliveries')
          .update({ status: newStatus })
          .eq('id', delivery.id)
        if (res.error) throw res.error
      }
      
      await fetchDeliveries() // Refresh lists
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mb-4"></div>
      <p className="text-gray-500 font-medium">Loading your route...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Mobile-Friendly Fixed Header */}
      <header className="bg-green-700 text-white p-4 shadow-md sticky top-0 z-50">
        <h1 className="text-xl font-black tracking-tight">Lunchmate Driver</h1>
        <p className="text-green-100 text-xs font-medium mt-1">Route for {todayDateString()}</p>
      </header>

      {/* Navigation Tabs */}
      <div className="flex bg-white shadow-sm mb-4">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pending' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500'}`}
        >
          Pending ({pendingDeliveries.length})
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'completed' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500'}`}
        >
          Completed ({completedDeliveries.length})
        </button>
      </div>

      <div className="px-3 space-y-4 max-w-lg mx-auto">
        <Alert type="error" message={error} onClose={() => setError('')} />

        {currentList.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 mt-8">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-gray-600 font-medium">No deliveries {activeTab === 'pending' ? 'left to do!' : 'completed yet.'}</p>
          </div>
        ) : (
          currentList.map((d) => {
            const cust = d.orders?.customers || {}
            let type = 'Veg'
            const dt = d.menu_items?.dietary_type
            const name = (d.meal_name_snapshot || '').toLowerCase()
            if (dt === 'non_vegetarian' || name.includes('non-veg') || name.includes('chicken') || name.includes('egg')) type = 'Non-Veg'

            return (
              <div key={d.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Status Bar */}
                <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center ${d.status === 'pending' ? 'bg-blue-50 text-blue-800 border-b border-blue-100' : d.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <span>{d.status}</span>
                  <span>{d.meal_slot}</span>
                </div>

                <div className="p-4">
                  {/* Customer Info */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h2 className="text-lg font-black text-gray-900">{cust.name}</h2>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{cust.address}</p>
                    </div>
                  </div>

                  {/* Meal Details */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`h-3 w-3 rounded-full ${type === 'Veg' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <p className="font-bold text-gray-800">{d.meal_name_snapshot}</p>
                    </div>
                    {d.notes && (
                      <p className="text-xs font-bold text-amber-700 bg-amber-50 inline-block px-2 py-1 rounded mt-2 border border-amber-200">
                        ⚠️ Note: {d.notes}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <a 
                      href={`tel:${cust.contact}`}
                      className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl text-sm transition-colors"
                    >
                      📞 Call
                    </a>
                    <a 
                      href={getDirectionsLink(cust)}
                      target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-3 px-4 rounded-xl text-sm transition-colors"
                    >
                      🗺️ Navigate
                    </a>
                  </div>

                  {d.status === 'pending' && (
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-gray-100">
                      <button
                        disabled={updatingId === d.id}
                        onClick={() => updateStatus(d, 'missed')}
                        className="col-span-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-4 rounded-xl text-sm transition-colors disabled:opacity-50"
                      >
                        ❌ Missed
                      </button>
                      <button
                        disabled={updatingId === d.id}
                        onClick={() => updateStatus(d, 'delivered')}
                        className="col-span-2 bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl text-lg shadow-sm transition-colors disabled:opacity-50"
                      >
                        {updatingId === d.id ? 'Saving...' : '✅ DELIVERED'}
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
