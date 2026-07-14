import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString } from '../lib/date'
import Alert from '../components/Alert'

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  missed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

function money(value) {
  return `Rs.${Number(value || 0).toFixed(2)}`
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
        id,
        scheduled_date,
        status,
        notes,
        meal_name_snapshot,
        unit_price,
        is_auto_extension,
        orders (
          id,
          order_type,
          plan_credits,
          credits_used,
          subscription_instructions,
          customers ( name, contact, address )
        )
      `)
      .eq('scheduled_date', todayDateString())
      .order('id')

    if (error) {
      setError(error.message)
      setDeliveries([])
    } else {
      setDeliveries(data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function updateStatus(delivery, newStatus) {
    const order = delivery.orders
    const isSubscription = order?.order_type === 'subscription'

    if (
      newStatus === 'missed' &&
      isSubscription &&
      !window.confirm(
        'Skip this subscription delivery? No credit will be used and the plan will extend automatically.'
      )
    ) {
      return
    }

    setUpdatingId(delivery.id)
    setError('')

    const result =
      newStatus === 'missed' && isSubscription
        ? await supabase.rpc('skip_delivery_and_extend', {
            p_delivery_id: delivery.id,
            p_skip_reason: null,
          })
        : await supabase
            .from('deliveries')
            .update({ status: newStatus })
            .eq('id', delivery.id)

    if (result.error) {
      setError(`Failed to update delivery: ${result.error.message}`)
    } else {
      await load()
    }

    setUpdatingId(null)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Today's Deliveries</h1>
          <p className="text-sm text-gray-500">
            Only meals scheduled for today are shown here.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="text-sm text-green-700 font-medium hover:underline"
        >
          Refresh
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {loading ? (
        <p className="text-sm text-gray-400">Loading deliveries...</p>
      ) : deliveries.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-500">
          No deliveries scheduled for today.
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Meal for today</th>
                <th className="px-4 py-3">Plan / credits</th>
                <th className="px-4 py-3">Instructions</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {deliveries.map((delivery) => {
                const order = delivery.orders
                const customer = order?.customers
                const isPending = delivery.status === 'pending'
                const isSubscription = order?.order_type === 'subscription'

                return (
                  <tr key={delivery.id} className="border-t align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{customer?.name || '-'}</p>
                      <p className="text-xs text-gray-500">{customer?.contact || ''}</p>
                      <p className="text-xs text-gray-400 mt-1">{customer?.address || ''}</p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium">{delivery.meal_name_snapshot || '-'}</p>
                      <p className="text-xs text-gray-500">{money(delivery.unit_price)}</p>

                      {delivery.notes && (
                        <p className="text-xs text-blue-700 mt-1">
                          Today note: {delivery.notes}
                        </p>
                      )}

                      {delivery.is_auto_extension && (
                        <p className="text-xs text-purple-700 mt-1">
                          Auto-extension replacement
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {isSubscription ? (
                        <>
                          <p className="font-medium">Subscription</p>
                          <p className="text-xs text-gray-500">
                            {order.credits_used}/{order.plan_credits} used
                          </p>
                          <p className="text-xs text-green-700">
                            {Math.max(order.plan_credits - order.credits_used, 0)} remaining
                          </p>
                        </>
                      ) : (
                        <span>One-time</span>
                      )}
                    </td>

                    <td className="px-4 py-3 max-w-xs text-xs text-gray-600">
                      {order?.subscription_instructions || '-'}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          STATUS_STYLES[delivery.status]
                        }`}
                      >
                        {delivery.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {isPending ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            disabled={updatingId === delivery.id}
                            onClick={() => updateStatus(delivery, 'delivered')}
                            className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-md disabled:opacity-50"
                          >
                            Delivered
                          </button>

                          <button
                            type="button"
                            disabled={updatingId === delivery.id}
                            onClick={() => updateStatus(delivery, 'missed')}
                            className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-md disabled:opacity-50"
                          >
                            {isSubscription ? 'Skip & Extend' : 'Missed'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Finalized</span>
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