import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString } from '../lib/date'
import Alert from '../components/Alert'

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  missed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        id, scheduled_date, status, notes,
        orders (
          id, order_type, plan_credits, credits_used,
          customers ( name, contact, address ),
          menu_items ( name )
        )
      `)
      .eq('scheduled_date', todayDateString())
      .order('id')

    if (error) {
      setError(error.message)
    } else {
      setDeliveries(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateStatus(deliveryId, newStatus) {
    setUpdatingId(deliveryId)
    setError('')
    const { error } = await supabase
      .from('deliveries')
      .update({ status: newStatus })
      .eq('id', deliveryId)
    setUpdatingId(null)
    if (error) {
      setError(`Failed to update delivery: ${error.message}`)
      return
    }
    load()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Today's Deliveries</h1>
        <button onClick={load} className="text-sm text-green-700 hover:underline">Refresh</button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : deliveries.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-500 text-sm">
          No deliveries scheduled for today.
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => {
                const order = d.orders
                const customer = order?.customers
                const item = order?.menu_items
                const isPending = d.status === 'pending'
                return (
                  <tr key={d.id} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-medium">{customer?.name || '-'}</p>
                      <p className="text-xs text-gray-500">{customer?.contact}</p>
                    </td>
                    <td className="px-4 py-3">{item?.name || '-'}</td>
                    <td className="px-4 py-3">
                      {order?.order_type === 'subscription' ? (
                        <span className="text-xs">
                          Subscription
                          <span className="text-gray-400"> ({order.credits_used}/{order.plan_credits})</span>
                        </span>
                      ) : (
                        <span className="text-xs">One-time</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[d.status]}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isPending ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            disabled={updatingId === d.id}
                            onClick={() => updateStatus(d.id, 'delivered')}
                            className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-md disabled:opacity-50"
                          >
                            Delivered
                          </button>
                          <button
                            disabled={updatingId === d.id}
                            onClick={() => updateStatus(d.id, 'missed')}
                            className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-md disabled:opacity-50"
                          >
                            Missed
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
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
  )
}
