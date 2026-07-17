import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString } from '../lib/date'
import Alert from '../components/Alert'

export default function DeliveryRoster() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [slotFilter, setSlotFilter] = useState('all')

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
                address
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
      let type = 'Veg' // Default fallback
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
        meal: d.meal_name_snapshot,
        type,
        slot: d.meal_slot,
        notes: d.notes
      }
    })
  }, [deliveries])

  const filteredRoster = useMemo(() => {
    if (slotFilter === 'all') return processedRoster
    return processedRoster.filter(d => d.slot === slotFilter)
  }, [processedRoster, slotFilter])

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

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Slot:</label>
          <select 
            value={slotFilter} 
            onChange={(e) => setSlotFilter(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
          <button 
            onClick={() => window.print()}
            className="ml-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            Print Roster
          </button>
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Customer & Contact</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Meal Details</th>
                <th className="px-6 py-4">Slot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    No pending deliveries for this selection.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 align-top">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{d.name}</div>
                      <div className="text-blue-600 font-medium">{d.contact}</div>
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
