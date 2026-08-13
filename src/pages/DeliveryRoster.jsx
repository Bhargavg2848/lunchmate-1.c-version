import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString } from '../lib/date'
import Alert from '../components/Alert'

const KITCHEN_COORDS = [82.234376, 16.968230] // Longitude, Latitude

export default function DeliveryRoster() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [slotFilter, setSlotFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  
  // Intelligent Batching State
  const [optimizing, setOptimizing] = useState(false)
  const [optimizedSequence, setOptimizedSequence] = useState([])

  useEffect(() => {
    async function fetchRoster() {
      setLoading(true)
      setError('')

      try {
        const { data, error } = await supabase
          .from('deliveries')
          .select(`
            id,
            meal_slot,
            meal_name_snapshot,
            status,
            notes,
            menu_items (
              dietary_type
            ),
            orders (
              customers (
                name,
                contact,
                address,
                latitude,
                longitude
              )
            )
          `)
          .eq('scheduled_date', todayDateString())
          .eq('status', 'pending')

        if (error) throw error
        setDeliveries(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRoster()
  }, [])

  const processedRoster = useMemo(() => {
    return deliveries.map(d => {
      const customer = d.orders?.customers || {}
      let type = 'Veg'
      const dt = d.menu_items?.dietary_type
      const name = (d.meal_name_snapshot || '').toLowerCase()

      if (dt === 'vegetarian') {
        type = 'Veg'
      } else if (dt === 'non_vegetarian') {
        type = 'Non-Veg'
      } else if (
        name.includes('non-veg') || 
        name.includes('non veg') || 
        name.includes('chicken') || 
        name.includes('egg') ||
        (name.includes('protein') && !name.includes('vegetarian'))
      ) {
        type = 'Non-Veg'
      }

      return {
        id: d.id,
        name: customer.name || 'N/A',
        contact: customer.contact || 'N/A',
        address: customer.address || 'N/A',
        lat: customer.latitude || null,
        lng: customer.longitude || null,
        meal: d.meal_name_snapshot,
        type,
        slot: d.meal_slot,
        notes: d.notes
      }
    })
  }, [deliveries])

  async function optimizeRoute() {
    // 1. Filter only the currently selected slot to avoid mixing lunch and dinner routes
    const activeSlotDeliveries = slotFilter === 'all' 
      ? processedRoster 
      : processedRoster.filter(d => d.slot === slotFilter)

    const validStops = activeSlotDeliveries.filter(d => d.lat && d.lng)
    
    if (validStops.length === 0) {
      setError('No deliveries with valid map coordinates found in this list.')
      return
    }
    if (validStops.length > 50) {
      setError('OSRM public API limits routing to 50 stops. Please filter your list further.')
      return
    }

    setOptimizing(true)
    setError('')

    try {
      // 2. Format Coordinates: Kitchen is ALWAYS the first coordinate (source)
      const coordStrings = [
        KITCHEN_COORDS.join(','), 
        ...validStops.map(d => `${d.lng},${d.lat}`)
      ]
      
      const coordsQuery = coordStrings.join(';')
      
      // 3. Ping OSRM Trip API (source=first forces the kitchen as the start point)
      const url = `https://router.project-osrm.org/trip/v1/driving/${coordsQuery}?source=first&roundtrip=false`
      
      const res = await fetch(url)
      const data = await res.json()
      
      if (data.code !== 'Ok') throw new Error(data.message || 'Routing failed')

      // 4. Map the OSRM Waypoint indexes back to our delivery IDs
      // Waypoint 0 is the kitchen, so validStops[0] corresponds to Waypoint 1
      const mappedSequence = validStops.map((d, index) => {
        const waypoint = data.waypoints[index + 1]
        return { id: d.id, routePosition: waypoint.waypoint_index }
      })

      // Sort by the route position calculated by OSRM
      mappedSequence.sort((a, b) => a.routePosition - b.routePosition)
      
      // 5. Apply the sequence state and lock the UI sorting mode
      setOptimizedSequence(mappedSequence.map(m => m.id))
      setSortBy('optimized')
      setSortDirection('asc')

    } catch (err) {
      setError('Route batching failed: ' + err.message)
    } finally {
      setOptimizing(false)
    }
  }

  const filteredRoster = useMemo(() => {
    const scoped = slotFilter === 'all'
      ? processedRoster
      : processedRoster.filter(d => d.slot === slotFilter)

    return [...scoped].sort((a, b) => {
      // If "Smart Route" is selected, respect the OSRM optimized sequence
      if (sortBy === 'optimized' && optimizedSequence.length > 0) {
        const idxA = optimizedSequence.indexOf(a.id)
        const idxB = optimizedSequence.indexOf(b.id)
        
        // Push deliveries without coordinates to the absolute bottom of the printed list
        const rankA = idxA === -1 ? 99999 : idxA
        const rankB = idxB === -1 ? 99999 : idxB
        
        return sortDirection === 'asc' ? rankA - rankB : rankB - rankA
      }

      // Standard text sorting
      const left = String(a[sortBy] || '').toLowerCase()
      const right = String(b[sortBy] || '').toLowerCase()
      if (left === right) return 0
      return sortDirection === 'asc'
        ? left.localeCompare(right)
        : right.localeCompare(left)
    })
  }, [processedRoster, slotFilter, sortBy, sortDirection, optimizedSequence])

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-gray-600">Loading delivery roster...</span>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Roster</h1>
          <p className="text-gray-500">Logistics for {todayDateString()}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Slot:</label>
          <select 
            value={slotFilter} 
            onChange={(e) => {
              setSlotFilter(e.target.value)
              if (sortBy === 'optimized') setSortBy('name') // Reset smart route if filter changes
            }}
            className="border rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Customer</option>
            <option value="contact">Contact</option>
            <option value="meal">Meal</option>
            <option value="address">Address</option>
            <option value="slot">Slot</option>
            {optimizedSequence.length > 0 && <option value="optimized" className="font-bold text-blue-700">★ Smart Route</option>}
          </select>
          <select
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          
          <button 
            type="button"
            disabled={optimizing}
            onClick={optimizeRoute}
            className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {optimizing ? 'Calculating...' : '🪄 Optimize Route'}
          </button>

          <button 
            onClick={() => window.print()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {sortBy === 'optimized' && (
        <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg flex items-center justify-between shadow-sm">
          <p className="text-sm font-bold text-indigo-800">
            ✅ Route Batching Active: This list is now perfectly ordered for the fastest continuous drive from the kitchen.
          </p>
        </div>
      )}

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
              <tr>
                {sortBy === 'optimized' && <th className="px-6 py-4 w-12 text-center">Stop</th>}
                <th className="px-6 py-4">Customer & Contact</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Meal Details</th>
                <th className="px-6 py-4">Slot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No pending deliveries for this selection.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((d, index) => (
                  <tr key={d.id} className="hover:bg-gray-50 align-top">
                    {sortBy === 'optimized' && (
                      <td className="px-6 py-4 text-center">
                         {optimizedSequence.includes(d.id) ? (
                           <span className="bg-indigo-600 text-white font-bold h-6 w-6 inline-flex items-center justify-center rounded-full text-xs">
                             {index + 1}
                           </span>
                         ) : (
                           <span className="text-red-500 text-xs font-bold" title="Missing Map Coordinates">N/A</span>
                         )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{d.name}</div>
                      <div className="text-blue-600 font-medium">{d.contact}</div>
                      {!d.lat && <span className="text-[10px] text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-200 mt-1 inline-block">No Map Pin</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700 leading-relaxed max-w-xs">{d.address}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-bold border ${
                          d.type === 'Veg' 
                            ? 'text-green-700 border-green-700 bg-green-50' 
                            : 'text-red-700 border-red-700 bg-red-50'
                        }`}>
                          {d.type}
                        </span>
                        <span className="font-medium text-gray-900">{d.meal}</span>
                      </div>
                      {d.notes && (
                        <div className="text-xs bg-yellow-50 text-yellow-800 p-1.5 rounded border border-yellow-100 mt-1">
                          <strong>Note:</strong> {d.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 font-medium">
                        {d.slot}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
