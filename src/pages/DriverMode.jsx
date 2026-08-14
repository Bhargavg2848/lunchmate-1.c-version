import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString } from '../lib/date'
import Alert from '../components/Alert'
import { Phone, Navigation, Check, Sparkles, Truck, CircleCheck } from 'lucide-react'

const KITCHEN_COORDS = [82.234376, 16.968230] // Longitude, Latitude

function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-[#E5E2DA] overflow-hidden shadow-[0_4px_24px_-4px_rgba(30,58,43,0.06)]">
      <div className="h-8 bg-[#F3F0EA]" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-32 bg-[#F3F0EA] rounded-lg animate-pulse" />
        <div className="h-3.5 w-48 bg-[#F3F0EA] rounded-lg animate-pulse" />
        <div className="h-12 w-full bg-[#F3F0EA] rounded-2xl animate-pulse" />
        <div className="h-11 w-full bg-[#F3F0EA] rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}

export default function DriverMode() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')

  // Intelligent Routing State
  const [optimizing, setOptimizing] = useState(false)
  const [optimizedSequence, setOptimizedSequence] = useState([])

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
        const res = await supabase.from('deliveries').update({ status: newStatus }).eq('id', delivery.id)
        if (res.error) throw res.error
      }
      // Remove from optimized sequence if completed
      setOptimizedSequence(prev => prev.filter(id => id !== delivery.id))
      await fetchDeliveries()
    } catch (err) {
      setError(`Failed to update: ${err.message}`)
    } finally {
      setUpdatingId(null)
    }
  }

  async function optimizeDriverRoute() {
    const pendingList = deliveries.filter(d => d.status === 'pending')
    const validStops = pendingList.filter(d => d.orders?.customers?.latitude && d.orders?.customers?.longitude)

    if (validStops.length === 0) {
      setError('No pending deliveries have valid map coordinates.')
      return
    }
    if (validStops.length > 50) {
      setError('OSRM limits routing to 50 stops at a time.')
      return
    }

    setOptimizing(true)
    setError('')

    try {
      // Create coordinate string with Kitchen as start point
      const coordStrings = [
        KITCHEN_COORDS.join(','),
        ...validStops.map(d => `${d.orders.customers.longitude},${d.orders.customers.latitude}`)
      ]

      const url = `https://router.project-osrm.org/trip/v1/driving/${coordStrings.join(';')}?source=first&roundtrip=false`
      const res = await fetch(url)
      const data = await res.json()

      if (data.code !== 'Ok') throw new Error('Routing calculation failed.')

      // Map sequence back to delivery IDs
      const mappedSequence = validStops.map((d, index) => {
        const waypoint = data.waypoints[index + 1]
        return { id: d.id, routePosition: waypoint.waypoint_index }
      })

      mappedSequence.sort((a, b) => a.routePosition - b.routePosition)
      setOptimizedSequence(mappedSequence.map(m => m.id))

    } catch (err) {
      setError('Route batching failed: ' + err.message)
    } finally {
      setOptimizing(false)
    }
  }

  function getDirectionsLink(customer) {
    if (customer.latitude && customer.longitude) return `https://www.google.com/maps/dir/?api=1&destination=${customer.latitude},${customer.longitude}`
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`
  }

  const completedDeliveries = deliveries.filter(d => d.status !== 'pending')

  // Apply sorting logic to pending deliveries
  let pendingDeliveries = deliveries.filter(d => d.status === 'pending')
  if (optimizedSequence.length > 0) {
    pendingDeliveries.sort((a, b) => {
      const idxA = optimizedSequence.indexOf(a.id)
      const idxB = optimizedSequence.indexOf(b.id)
      const rankA = idxA === -1 ? 9999 : idxA
      const rankB = idxB === -1 ? 9999 : idxB
      return rankA - rankB
    })
  }

  const currentList = activeTab === 'pending' ? pendingDeliveries : completedDeliveries

  return (
    <div className="fixed inset-0 z-[9999] bg-[#FAF8F5] overflow-y-auto font-sans pb-24">
      {/* Subtle floating decorations */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <span className="absolute left-[6%] top-[14%] text-2xl opacity-[0.14] animate-float-slow select-none">🍃</span>
        <span className="absolute right-[8%] top-[24%] text-xl opacity-[0.12] animate-float-delayed select-none">🥕</span>
        <span className="absolute left-[12%] bottom-[16%] text-xl opacity-[0.12] animate-float-delayed select-none">🍅</span>
      </div>

      <header className="sticky top-0 z-50 bg-[#1E3A2B]/95 backdrop-blur-md text-[#FAF8F5] px-5 py-4 shadow-[0_4px_20px_-4px_rgba(30,58,43,0.3)]">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Truck size={19} strokeWidth={2} /> Driver Hub
            </h1>
            <p className="text-[#9CB0A5] text-xs font-medium mt-0.5">{todayDateString()} · Kakinada</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
            <span className="text-sm font-semibold tracking-wide">{pendingDeliveries.length} left</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-lg mx-auto w-full px-4 pt-5 pb-2">
        <div className="flex p-1 bg-[#F3F0EA] rounded-2xl border border-[#E5E2DA]">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ease-out active:scale-[0.97] ${
              activeTab === 'pending' ? 'bg-white text-[#1E3A2B] shadow-[0_2px_8px_-2px_rgba(30,58,43,0.15)]' : 'text-[#808D85] hover:text-[#526058]'
            }`}
          >
            Pending ({pendingDeliveries.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ease-out active:scale-[0.97] ${
              activeTab === 'completed' ? 'bg-white text-[#1E3A2B] shadow-[0_2px_8px_-2px_rgba(30,58,43,0.15)]' : 'text-[#808D85] hover:text-[#526058]'
            }`}
          >
            Completed ({completedDeliveries.length})
          </button>
        </div>
      </div>

      <div className="relative z-10 px-4 space-y-4 max-w-lg mx-auto mt-2">
        <Alert type="error" message={error} onClose={() => setError('')} />

        {/* Smart Route Button (Only visible on Pending tab if there are deliveries) */}
        {activeTab === 'pending' && pendingDeliveries.length > 1 && (
           <button
             onClick={optimizeDriverRoute}
             disabled={optimizing}
             className="w-full bg-white border border-[#DCE8E0] text-[#2E5B44] hover:bg-[#F0F5F2] hover:shadow-[0_6px_16px_-4px_rgba(46,91,68,0.18)] font-semibold py-3.5 rounded-2xl text-sm transition-all duration-200 ease-out active:scale-[0.97] shadow-sm mb-2 flex items-center justify-center gap-2 disabled:opacity-50"
           >
            {optimizing ? 'Calculating fastest path…' : (
              <>
                <Sparkles size={16} strokeWidth={2} /> Optimize my route
              </>
            )}
          </button>
        )}

        {optimizedSequence.length > 0 && activeTab === 'pending' && (
           <div className="bg-[#F0F5F2] text-[#2E5B44] text-xs font-semibold text-center py-2.5 rounded-xl border border-[#DCE8E0] flex items-center justify-center gap-1.5">
             <CircleCheck size={14} /> Route sequenced for fastest delivery.
           </div>
        )}

        {loading ? (
          <div className="space-y-4 mt-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-3xl shadow-[0_4px_24px_-4px_rgba(30,58,43,0.06)] border border-[#E5E2DA] mt-6 transition-all">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-[#F0F5F2] flex items-center justify-center text-[#2E5B44]">
              <CircleCheck size={22} strokeWidth={1.8} />
            </div>
            <p className="text-[#1A2420] font-bold text-lg">{activeTab === 'pending' ? 'All caught up!' : 'No completed deliveries.'}</p>
            <p className="text-[#808D85] text-sm mt-1">{activeTab === 'pending' ? 'Take a break, you earned it.' : 'Check back later.'}</p>
          </div>
        ) : (
          currentList.map((d, index) => {
            const cust = d.orders?.customers || {}
            let type = 'Veg'
            const dt = d.menu_items?.dietary_type
            const name = (d.meal_name_snapshot || '').toLowerCase()
            if (dt === 'non_vegetarian' || name.includes('non-veg') || name.includes('chicken') || name.includes('egg')) type = 'Non-Veg'

            return (
              <div key={d.id} className="bg-white rounded-3xl shadow-[0_4px_24px_-4px_rgba(30,58,43,0.06)] border border-[#E5E2DA] overflow-hidden hover:shadow-[0_8px_28px_-6px_rgba(30,58,43,0.12)] transition-shadow duration-300 relative">

                {activeTab === 'pending' && optimizedSequence.length > 0 && optimizedSequence.includes(d.id) && (
                  <div className="absolute top-4 right-4 bg-[#1E3A2B] text-white font-bold h-8 w-8 rounded-full flex items-center justify-center shadow-md border-2 border-white z-10 text-sm">
                    {index + 1}
                  </div>
                )}

                <div className={`px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest flex justify-between items-center ${
                  d.status === 'pending' ? 'bg-[#F3F0EA] text-[#526058] border-b border-[#E5E2DA]' : d.status === 'delivered' ? 'bg-[#F0F5F2] text-[#2E5B44] border-b border-[#DCE8E0]' : 'bg-[#FEF3C7] text-amber-800 border-b border-amber-700/10'
                }`}>
                  <span>{d.status}</span>
                  <span className="capitalize">{d.meal_slot}</span>
                </div>

                <div className="p-5">
                  <div className="mb-4 pr-10">
                    <h2 className="text-lg font-bold text-[#1A2420] tracking-tight">{cust.name}</h2>
                    <p className="text-sm text-[#526058] mt-1 leading-relaxed">{cust.address}</p>
                  </div>

                  <div className="bg-[#FAF8F5] rounded-2xl p-3.5 mb-5 border border-[#E5E2DA]">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full shadow-inner ${type === 'Veg' ? 'bg-[#2E5B44]' : 'bg-amber-700'}`}></div>
                      <p className="font-semibold text-[#1A2420] text-sm">{d.meal_name_snapshot}</p>
                    </div>
                    {d.notes && (
                      <div className="mt-2.5 flex items-start gap-2 bg-[#FEF3C7]/70 p-2.5 rounded-xl border border-amber-700/10">
                        <span className="text-amber-600 text-xs font-black pt-px">!</span>
                        <p className="text-xs font-semibold text-amber-800 leading-relaxed">{d.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <a href={`tel:${cust.contact}`} className="flex items-center justify-center gap-2 bg-[#F3F0EA] hover:bg-[#EAE5DC] text-[#1A2420] font-semibold py-3.5 px-4 rounded-2xl text-sm transition-all duration-200 ease-out active:scale-[0.97] border border-[#E5E2DA]">
                      <Phone size={16} strokeWidth={2} /> Call
                    </a>
                    <a href={getDirectionsLink(cust)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#F0F5F2] hover:bg-[#E4EFE8] text-[#2E5B44] font-semibold py-3.5 px-4 rounded-2xl text-sm transition-all duration-200 ease-out active:scale-[0.97] border border-[#DCE8E0]">
                      <Navigation size={16} strokeWidth={2} /> Navigate
                    </a>
                  </div>

                  {d.status === 'pending' && (
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#F3F0EA]">
                      <button disabled={updatingId === d.id} onClick={() => updateStatus(d, 'missed')} className="col-span-1 bg-amber-700/10 hover:bg-amber-700/15 text-amber-800 font-semibold py-4 rounded-2xl text-sm transition-all duration-200 ease-out active:scale-[0.97] disabled:opacity-50 border border-amber-700/20">
                        Missed
                      </button>
                      <button disabled={updatingId === d.id} onClick={() => updateStatus(d, 'delivered')} className="col-span-2 bg-[#1E3A2B] hover:bg-[#172E22] text-white font-bold py-4 rounded-2xl text-base shadow-[0_4px_14px_rgba(30,58,43,0.25)] hover:shadow-[0_8px_20px_rgba(30,58,43,0.3)] hover:-translate-y-px transition-all duration-200 ease-out active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2">
                        {updatingId === d.id ? 'Saving…' : <><Check size={18} strokeWidth={2.5} /> DELIVERED</>}
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
