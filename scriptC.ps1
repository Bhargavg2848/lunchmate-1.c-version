$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )

  $fullPath = Join-Path $PWD $Path
  $folder = Split-Path $fullPath -Parent

  if (-not (Test-Path $folder)) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
  }

  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8NoBom)
}

# ============================================================
# Subscriptions list page
# ============================================================

Write-Utf8NoBom "src/pages/Subscriptions.jsx" @'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Alert from '../components/Alert'

function money(value) {
  return `Rs.${Number(value || 0).toFixed(2)}`
}

function stateStyle(state) {
  if (state === 'active') return 'bg-green-100 text-green-800'
  if (state === 'completed') return 'bg-blue-100 text-blue-800'
  return 'bg-amber-100 text-amber-800'
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

        <button
          type="button"
          onClick={load}
          className="text-sm text-green-700 font-medium hover:underline"
        >
          Refresh
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="bg-white border rounded-lg p-4 mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by customer, phone, address, meal..."
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
                  <h2 className="font-bold text-lg">{subscription.customer_name}</h2>
                  <p className="text-sm text-gray-600">{subscription.customer_contact}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {subscription.customer_address}
                  </p>
                </div>

                <span
                  className={`text-xs font-medium rounded-full px-2 py-1 ${stateStyle(
                    subscription.subscription_state
                  )}`}
                >
                  {subscription.subscription_state.replace('_', ' ')}
                </span>
              </div>

              <div className="border-t mt-4 pt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Plan</p>
                  <p className="font-medium">{subscription.plan_name}</p>
                </div>

                <div>
                  <p className="text-gray-500">Next delivery</p>
                  <p className="font-medium">
                    {subscription.next_delivery_date || 'No pending delivery'}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Current future meal</p>
                  <p className="font-medium">
                    {subscription.current_future_menu_item_name || 'Completed'}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Credits</p>
                  <p className="font-medium">
                    {subscription.credits_used}/{subscription.plan_credits} used
                  </p>
                  <p className="text-xs text-green-700">
                    {subscription.credits_remaining} remaining
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-gray-50 border rounded-md p-3 text-sm">
                <p className="text-gray-500">Instructions</p>
                <p className="mt-1">
                  {subscription.subscription_instructions || 'No permanent instructions'}
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
                  className="bg-green-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-700"
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
'@

# ============================================================
# Subscription detail page
# ============================================================

Write-Utf8NoBom "src/pages/SubscriptionDetails.jsx" @'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { todayDateString } from '../lib/date'
import Alert from '../components/Alert'

function money(value) {
  return `Rs.${Number(value || 0).toFixed(2)}`
}

const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  missed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
}

export default function SubscriptionDetails() {
  const { orderId } = useParams()

  const [overview, setOverview] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [instructions, setInstructions] = useState('')
  const [futureDate, setFutureDate] = useState(todayDateString())
  const [futureMealId, setFutureMealId] = useState('')
  const [amountReceived, setAmountReceived] = useState('0')
  const [paymentMode, setPaymentMode] = useState('cash')

  const [editingDeliveryId, setEditingDeliveryId] = useState(null)
  const [oneDayMealId, setOneDayMealId] = useState('')
  const [oneDayNotes, setOneDayNotes] = useState('')

  const [skippingDeliveryId, setSkippingDeliveryId] = useState(null)
  const [skipReason, setSkipReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const [overviewResult, timelineResult, menuResult] = await Promise.all([
      supabase
        .from('subscription_overview')
        .select('*')
        .eq('subscription_order_id', orderId)
        .maybeSingle(),

      supabase
        .from('subscription_delivery_timeline')
        .select('*')
        .eq('subscription_order_id', orderId)
        .order('scheduled_date', { ascending: true }),

      supabase
        .from('menu_items')
        .select('id, name, price')
        .eq('active', true)
        .order('name'),
    ])

    if (overviewResult.error) {
      setError(overviewResult.error.message)
    } else if (!overviewResult.data) {
      setError('Subscription not found.')
    } else {
      const data = overviewResult.data
      setOverview(data)
      setInstructions(data.subscription_instructions || '')
      setFutureDate(data.next_delivery_date || todayDateString())
      setFutureMealId(data.current_future_menu_item_id || '')
      setAmountReceived(String(data.amount_received ?? 0))
      setPaymentMode(data.payment_mode || 'cash')
    }

    if (timelineResult.error) {
      setError((current) => current || timelineResult.error.message)
      setTimeline([])
    } else {
      setTimeline(timelineResult.data || [])
    }

    if (menuResult.error) {
      setError((current) => current || menuResult.error.message)
      setMenuItems([])
    } else {
      setMenuItems(menuResult.data || [])
    }

    setLoading(false)
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  async function execute(actionKey, request, message) {
    setBusy(actionKey)
    setError('')
    setSuccess('')

    const { error } = await request()

    if (error) {
      setError(error.message)
    } else {
      setSuccess(message)
      await load()
    }

    setBusy('')
  }

  function saveInstructions() {
    execute(
      'instructions',
      () =>
        supabase.rpc('set_subscription_instructions', {
          p_order_id: orderId,
          p_instructions: instructions.trim() || null,
        }),
      'Subscription instructions updated.'
    )
  }

  function saveFutureMeal() {
    if (!futureDate || !futureMealId) {
      setError('Select both a meal and the date from which it should apply.')
      return
    }

    execute(
      'future-meal',
      () =>
        supabase.rpc('change_future_subscription_meal', {
          p_order_id: orderId,
          p_from_date: futureDate,
          p_menu_item_id: futureMealId,
        }),
      'Future pending meals were updated and subscription total was recalculated.'
    )
  }

  function startOneDayEdit(delivery) {
    setEditingDeliveryId(delivery.delivery_id)
    setOneDayMealId(delivery.menu_item_id)
    setOneDayNotes(delivery.customization_notes || '')
    setSkippingDeliveryId(null)
  }

  function saveOneDayCustomization(delivery) {
    if (!oneDayMealId) {
      setError('Select a meal for this delivery.')
      return
    }

    execute(
      `one-day-${delivery.delivery_id}`,
      () =>
        supabase.rpc('set_delivery_customization', {
          p_delivery_id: delivery.delivery_id,
          p_menu_item_id: oneDayMealId,
          p_notes: oneDayNotes.trim() || null,
        }),
      `Customization saved for ${delivery.scheduled_date}.`
    )

    setEditingDeliveryId(null)
  }

  function openSkip(deliveryId) {
    setSkippingDeliveryId(deliveryId)
    setSkipReason('')
    setEditingDeliveryId(null)
  }

  function confirmSkip(delivery) {
    const confirmed = window.confirm(
      `Skip ${delivery.scheduled_date}? No credit will be used. A replacement delivery will be added after the current final schedule date.`
    )

    if (!confirmed) return

    execute(
      `skip-${delivery.delivery_id}`,
      () =>
        supabase.rpc('skip_delivery_and_extend', {
          p_delivery_id: delivery.delivery_id,
          p_skip_reason: skipReason.trim() || null,
        }),
      'Delivery skipped. A replacement pending meal was added at the end of the plan.'
    )

    setSkippingDeliveryId(null)
    setSkipReason('')
  }

  function saveAmountReceived() {
    const parsedAmount = Number(amountReceived)

    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Enter a valid amount received.')
      return
    }

    execute(
      'payment',
      () =>
        supabase.rpc('set_order_amount_received', {
          p_order_id: orderId,
          p_amount_received: parsedAmount,
          p_payment_mode: paymentMode,
        }),
      'Amount received and payment balance updated.'
    )
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading subscription...</p>
  }

  if (!overview) {
    return (
      <div>
        <Alert type="error" message={error || 'Subscription not found.'} />
        <Link to="/subscriptions" className="text-sm text-green-700 hover:underline">
          Back to subscriptions
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-5">
        <div>
          <Link to="/subscriptions" className="text-sm text-green-700 hover:underline">
            Back to subscriptions
          </Link>

          <h1 className="text-2xl font-bold mt-2">{overview.customer_name}</h1>
          <p className="text-sm text-gray-600">{overview.customer_contact}</p>
          <p className="text-sm text-gray-500">{overview.customer_address}</p>
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
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <section className="bg-white border rounded-lg p-5 mb-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-gray-500">Plan</p>
            <p className="font-bold mt-1">{overview.plan_name}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Original meal</p>
            <p className="font-bold mt-1">{overview.original_menu_item_name}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Current next meal</p>
            <p className="font-bold mt-1">
              {overview.current_future_menu_item_name || 'Plan completed'}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Next delivery</p>
            <p className="font-bold mt-1">
              {overview.next_delivery_date || 'No pending delivery'}
            </p>
          </div>
        </div>

        <div className="border-t mt-5 pt-5 grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-gray-500">Credits used</p>
            <p className="text-xl font-bold mt-1">
              {overview.credits_used}/{overview.plan_credits}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Credits remaining</p>
            <p className="text-xl font-bold text-green-700 mt-1">
              {overview.credits_remaining}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Missed/skipped</p>
            <p className="text-xl font-bold text-red-700 mt-1">
              {overview.missed_count}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Pending meals</p>
            <p className="text-xl font-bold text-amber-700 mt-1">
              {overview.pending_count}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-bold">Permanent subscription instructions</h2>
          <p className="text-sm text-gray-500 mt-1">
            These apply to the whole plan, such as less oil, no onion, or call first.
          </p>

          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={4}
            className="w-full border rounded-md px-3 py-2 text-sm mt-3"
            placeholder="Less oil, no onion, call before delivery..."
          />

          <button
            type="button"
            disabled={busy === 'instructions'}
            onClick={saveInstructions}
            className="mt-3 bg-green-600 text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy === 'instructions' ? 'Saving...' : 'Save Instructions'}
          </button>
        </section>

        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-bold">Payment and revised price</h2>

          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div>
              <p className="text-gray-500">Original total</p>
              <p className="font-bold">{money(overview.original_total_amount)}</p>
            </div>

            <div>
              <p className="text-gray-500">Current revised total</p>
              <p className="font-bold">{money(overview.revised_total_amount)}</p>
            </div>

            <div>
              <p className="text-gray-500">Customer still owes</p>
              <p className="font-bold text-red-700">{money(overview.amount_due)}</p>
            </div>

            <div>
              <p className="text-gray-500">Customer credit/refund</p>
              <p className="font-bold text-blue-700">
                {money(overview.customer_credit)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Total received so far</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountReceived}
                onChange={(event) => setAmountReceived(event.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Payment mode</label>
              <select
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={busy === 'payment'}
            onClick={saveAmountReceived}
            className="mt-3 bg-green-600 text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy === 'payment' ? 'Saving...' : 'Save Payment Amount'}
          </button>
        </section>
      </div>

      <section className="bg-white border rounded-lg p-5 mb-4">
        <h2 className="font-bold">Change meal for future pending deliveries</h2>
        <p className="text-sm text-gray-500 mt-1">
          This changes every pending meal from the selected date onward and recalculates the subscription price.
          One-day notes remain, but meal choices can be customized again afterward if needed.
        </p>

        <div className="grid gap-3 md:grid-cols-3 mt-4">
          <input
            type="date"
            min={todayDateString()}
            value={futureDate}
            onChange={(event) => setFutureDate(event.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />

          <select
            value={futureMealId}
            onChange={(event) => setFutureMealId(event.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Select future meal...</option>
            {menuItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {money(item.price)}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={busy === 'future-meal'}
            onClick={saveFutureMeal}
            className="bg-green-600 text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy === 'future-meal' ? 'Updating...' : 'Update Future Meals'}
          </button>
        </div>
      </section>

      <section className="bg-white border rounded-lg overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-bold">Delivery schedule and history</h2>
          <p className="text-sm text-gray-500 mt-1">
            Delivered and missed rows are history. Only pending rows can be changed or skipped.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Meal</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">One-day note</th>
                <th className="px-4 py-3">Schedule info</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {timeline.map((delivery) => (
                <Fragment key={delivery.delivery_id}>
                  <tr className="border-t align-top">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {delivery.scheduled_date}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium rounded-full px-2 py-1 ${
                          STATUS_STYLE[delivery.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {delivery.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium">{delivery.meal_name_snapshot}</p>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {money(delivery.unit_price)}
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      {delivery.customization_notes || '-'}
                      {delivery.skip_reason && (
                        <p className="text-xs text-red-700 mt-1">
                          Skip reason: {delivery.skip_reason}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {delivery.is_auto_extension ? (
                        <span className="text-xs text-blue-700">
                          Replacement for missed {delivery.replacement_for_missed_date}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Original schedule</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {delivery.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startOneDayEdit(delivery)}
                            className="border rounded-md px-3 py-1.5 text-xs hover:bg-gray-50"
                          >
                            Customize
                          </button>

                          <button
                            type="button"
                            onClick={() => openSkip(delivery.delivery_id)}
                            className="bg-red-600 text-white rounded-md px-3 py-1.5 text-xs hover:bg-red-700"
                          >
                            Skip & Extend
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Finalized</span>
                      )}
                    </td>
                  </tr>

                  {editingDeliveryId === delivery.delivery_id && (
                    <tr className="border-t bg-green-50">
                      <td colSpan="7" className="p-4">
                        <p className="font-medium text-sm mb-3">
                          Customize {delivery.scheduled_date}
                        </p>

                        <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto]">
                          <select
                            value={oneDayMealId}
                            onChange={(event) => setOneDayMealId(event.target.value)}
                            className="border rounded-md px-3 py-2 text-sm"
                          >
                            <option value="">Select meal...</option>
                            {menuItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} - {money(item.price)}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={oneDayNotes}
                            onChange={(event) => setOneDayNotes(event.target.value)}
                            placeholder="One-day note, e.g. no rice / extra salad"
                            className="border rounded-md px-3 py-2 text-sm"
                          />

                          <button
                            type="button"
                            disabled={busy === `one-day-${delivery.delivery_id}`}
                            onClick={() => saveOneDayCustomization(delivery)}
                            className="bg-green-600 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
                          >
                            Save
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingDeliveryId(null)}
                            className="border rounded-md px-3 py-2 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {skippingDeliveryId === delivery.delivery_id && (
                    <tr className="border-t bg-red-50">
                      <td colSpan="7" className="p-4">
                        <p className="font-medium text-sm">
                          Skip {delivery.scheduled_date} and extend this plan
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          The same meal and one-day note will be copied to the replacement delivery.
                          No credit will be deducted.
                        </p>

                        <div className="flex flex-col md:flex-row gap-3 mt-3">
                          <input
                            type="text"
                            value={skipReason}
                            onChange={(event) => setSkipReason(event.target.value)}
                            placeholder="Optional skip reason, e.g. customer travelling"
                            className="flex-1 border rounded-md px-3 py-2 text-sm"
                          />

                          <button
                            type="button"
                            disabled={busy === `skip-${delivery.delivery_id}`}
                            onClick={() => confirmSkip(delivery)}
                            className="bg-red-600 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
                          >
                            Confirm Skip & Extend
                          </button>

                          <button
                            type="button"
                            onClick={() => setSkippingDeliveryId(null)}
                            className="border rounded-md px-3 py-2 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
'@

# ============================================================
# Improved Today's Deliveries page
# Shows actual customized delivery meal, not only original order meal.
# ============================================================

Write-Utf8NoBom "src/pages/Deliveries.jsx" @'
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
'@

# ============================================================
# Update navigation and routes
# ============================================================

Write-Utf8NoBom "src/App.jsx" @'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import NewOrder from './pages/NewOrder.jsx'
import Deliveries from './pages/Deliveries.jsx'
import Subscriptions from './pages/Subscriptions.jsx'
import SubscriptionDetails from './pages/SubscriptionDetails.jsx'

function navClass(isActive) {
  return `px-3 py-1.5 rounded-md text-sm font-medium ${
    isActive
      ? 'bg-green-600 text-white'
      : 'text-gray-600 hover:bg-gray-100'
  }`
}

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-bold text-lg text-green-700">Lunchmate OS</span>

            <div className="flex flex-wrap gap-2">
              <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
                New Order
              </NavLink>

              <NavLink
                to="/deliveries"
                className={({ isActive }) => navClass(isActive)}
              >
                Today's Deliveries
              </NavLink>

              <NavLink
                to="/subscriptions"
                className={({ isActive }) => navClass(isActive)}
              >
                Subscriptions
              </NavLink>
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<NewOrder />} />
            <Route path="/deliveries" element={<Deliveries />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route
              path="/subscriptions/:orderId"
              element={<SubscriptionDetails />}
            />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
'@

Write-Host "Script C done - Subscription workspace created" -ForegroundColor Green
Write-Host "Created: Subscriptions.jsx, SubscriptionDetails.jsx, updated Deliveries.jsx, updated App.jsx" -ForegroundColor Green