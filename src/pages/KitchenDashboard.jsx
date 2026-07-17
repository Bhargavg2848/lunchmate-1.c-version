import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString } from '../lib/date'
import Alert from '../components/Alert'

export default function KitchenDashboard() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [slotFilter, setSlotFilter] = useState('all') // 'all', 'lunch', 'dinner'

  useEffect(() => {
    async function fetchTodayMeals() {
      setLoading(true)
      setError('')

      try {
        const { data, error } = await supabase
          .from('deliveries')
          .select(`
            id,
            meal_slot,
            meal_name_snapshot,
            notes,
            status,
            scheduled_date,
            menu_items (
              dietary_type
            ),
            orders (
              subscription_instructions,
              customers (
                name
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

    fetchTodayMeals()
  }, [])

  const processedDeliveries = useMemo(() => {
    return deliveries.map(d => {
      let type = 'Unknown'
      const dt = d.menu_items?.dietary_type
      const name = (d.meal_name_snapshot || '').toLowerCase()

      if (dt === 'vegetarian') {
        type = 'Veg'
      } else if (dt === 'non_vegetarian') {
        type = 'Non-Veg'
      } else {
        // Fallback detection logic
        if (
          name.includes('non-veg') || 
          name.includes('non veg') || 
          name.includes('chicken') || 
          name.includes('egg') ||
          (name.includes('protein') && !name.includes('vegetarian'))
        ) {
          type = 'Non-Veg'
        } else if (name.includes('veg') || name.includes('salad') || name.includes('paneer')) {
          type = 'Veg'
        } else {
          type = 'Veg' // Default to Veg
        }
      }

      return {
        ...d,
        displayType: type,
        customerName: d.orders?.customers?.name || 'Unknown',
        instructions: d.orders?.subscription_instructions || ''
      }
    })
  }, [deliveries])

  const filteredDeliveries = useMemo(() => {
    if (slotFilter === 'all') return processedDeliveries
    return processedDeliveries.filter(d => d.meal_slot === slotFilter)
  }, [processedDeliveries, slotFilter])

  const totals = useMemo(() => {
    return filteredDeliveries.reduce((acc, d) => {
      if (d.displayType === 'Veg') acc.veg++
      else if (d.displayType === 'Non-Veg') acc.nonVeg++
      else acc.other++
      return acc
    }, { veg: 0, nonVeg: 0, other: 0 })
  }, [filteredDeliveries])

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      <span className="ml-3 text-gray-600">Loading kitchen data...</span>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchen Dashboard</h1>
          <p className="text-gray-500">Meals to cook for {todayDateString()}</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter Slot:</label>
          <select 
            value={slotFilter} 
            onChange={(e) => setSlotFilter(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Slots</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border-l-4 border-green-500 rounded-lg shadow-sm p-5">
          <p className="text-sm text-gray-500 uppercase font-semibold">Veg Meals</p>
          <p className="text-3xl font-bold text-green-600">{totals.veg}</p>
        </div>
        <div className="bg-white border-l-4 border-red-500 rounded-lg shadow-sm p-5">
          <p className="text-sm text-gray-500 uppercase font-semibold">Non-Veg Meals</p>
          <p className="text-3xl font-bold text-red-600">{totals.nonVeg}</p>
        </div>
        <div className="bg-white border-l-4 border-blue-500 rounded-lg shadow-sm p-5">
          <p className="text-sm text-gray-500 uppercase font-semibold">Total Orders</p>
          <p className="text-3xl font-bold text-blue-600">{filteredDeliveries.length}</p>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-700">Meal Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-medium">
              <tr>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Meal</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Slot</th>
                <th className="px-6 py-3">Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                    No pending meals found for this slot.
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{d.customerName}</td>
                    <td className="px-6 py-4">
                      <div>{d.meal_name_snapshot}</div>
                      {d.notes && <div className="text-xs text-blue-600 mt-1 italic">Note: {d.notes}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        d.displayType === 'Veg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {d.displayType}
                      </span>
                    </td>
                    <td className="px-6 py-4 capitalize">{d.meal_slot}</td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={d.instructions}>
                      {d.instructions || '-'}
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
