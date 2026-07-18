import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Alert from '../components/Alert'

function money(value) {
  return `Rs.${Number(value || 0).toFixed(2)}`
}

function stateStyle(state) {
  if (state === 'active') return 'bg-green-100 text-green-800 border-green-200'
  if (state === 'completed') return 'bg-blue-100 text-blue-800 border-blue-200'
  return 'bg-amber-100 text-amber-800 border-amber-200'
}

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('active')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('subscription_overview')
      .select('*')
      .order('next_delivery_date', { ascending: true })

    if (error) {
      setError(error.message)
      setSubscriptions([])
    } else {
      setSubscriptions(data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredSubscriptions = useMemo(() => {
    const search = query.trim().toLowerCase()

    return subscriptions.filter((subscription) => {
      const matchesState =
        stateFilter === 'all' || subscription.subscription_state === stateFilter

      const searchableText = [
        subscription.customer_name,
        subscription.customer_contact,
        subscription.customer_address,
        subscription.plan_name,
        subscription.original_menu_item_name,
        subscription.current_future_menu_item_name,
        subscription.customer_id_string, 
        subscription.order_id // Will work perfectly once the view is updated
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return matchesState && (!search || searchableText.includes(search))
    })
  }, [subscriptions, query, stateFilter])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Subscriptions</h1>
          <p className="text-sm text-gray-500">
            One card per customer plan. Open a plan to see its full meal schedule.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/tracker"
            className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            📊 View Financial Tracker
          </Link>
          <button
            type="button"
            onClick={load}
            className="text-sm text-green-700 font-medium hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="bg-white border rounded-lg p-4 mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by customer, phone, address, ID, meal..."
          className="w-full border rounded-md px-3 py-2 text-sm"
        />

        <select
          value={stateFilter}
          onChange={(event) => setStateFilter(event.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="active">Active subscriptions</option>
          <option value="completed">Completed subscriptions</option>
          <option value="needs_attention">Needs attention</option>
          <option value="all">All subscriptions</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading subscriptions...</p>
      ) : filteredSubscriptions.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-500">
          No subscriptions found for this filter.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSubscriptions.map((subscription) => (
            <article
              key={subscription.subscription_order_id} 
              className="bg-white border rounded-lg p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-bold text-lg text-gray-900">{subscription.customer_name}</h2>
                    {subscription.customer_id_string && (
                      <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                        {subscription.customer_id_string}
                      </span>
                    )}
                  </div>
                  
                  {/* Safely rendering the tracking ID */}
                  {subscription.order_id && (
                     <div className="mb-2">
                        <span className="text-[11px] font-mono bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-md">
                          Order: {subscription.order_id}
                        </span>
                     </div>
                  )}

                  <p className="text-sm text-gray-600 mt-1">{subscription.customer_contact}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {subscription.customer_address}
                  </p>
                </div>

                <span
                  className={`text-xs font-medium border rounded-full px-2.5 py-1 whitespace-nowrap ${stateStyle(
                    subscription.subscription_state
                  )}`}
                >
                  {subscription.subscription_state.replace('_', ' ')}
                </span>
              </div>

              <div className="border-t mt-4 pt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Plan</p>
                  <p className="font-medium text-gray-900">{subscription.plan_name}</p>
                </div>

                <div>
                  <p className="text-gray-500">Next delivery</p>
                  <p className="font-medium text-gray-900">
                    {subscription.next_delivery_date || 'No pending delivery'}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Current future meal</p>
                  <p className="font-medium text-gray-900">
                    {subscription.current_future_menu_item_name || 'Completed'}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Credits</p>
                  <p className="font-medium text-gray-900">
                    {subscription.credits_used}/{subscription.plan_credits} used
                  </p>
                  <p className="text-xs text-green-700 font-semibold mt-0.5">
                    {subscription.credits_remaining} remaining
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-md p-3 text-sm">
                <p className="text-yellow-800 font-semibold text-xs uppercase tracking-wider mb-1">Permanent Instructions</p>
                <p className="text-yellow-900">
                  {subscription.subscription_instructions || <span className="text-yellow-600 italic">None provided</span>}
                </p>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="text-sm">
                  {Number(subscription.amount_due) > 0 ? (
                    <>
                      <p className="text-gray-500">Customer still owes</p>
                      <p className="font-bold text-red-700">
                        {money(subscription.amount_due)}
                      </p>
                    </>
                  ) : Number(subscription.customer_credit) > 0 ? (
                    <>
                      <p className="text-gray-500">Customer credit/refund due</p>
                      <p className="font-bold text-blue-700">
                        {money(subscription.customer_credit)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500">Payment balance</p>
                      <p className="font-bold text-green-700">Settled</p>
                    </>
                  )}
                </div>

                <Link
                  to={`/subscriptions/${subscription.subscription_order_id}`}
                  className="bg-green-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
                >
                  Open Subscription
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}