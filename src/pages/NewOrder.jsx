import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString, addDaysToDateString } from '../lib/date'
import CustomerPicker from '../components/CustomerPicker'
import MenuPicker from '../components/MenuPicker'
import Alert from '../components/Alert'

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

export default function NewOrder() {
  const [customer, setCustomer] = useState(null)
  const [orderType, setOrderType] = useState('one_time')
  const [menuItem, setMenuItem] = useState(null)
  const [plans, setPlans] = useState([])
  const [planId, setPlanId] = useState('')
  const [startDate, setStartDate] = useState(addDaysToDateString(todayDateString(), 1))
  const [paymentStatus, setPaymentStatus] = useState('not_paid')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function loadPlans() {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, credits')
        .eq('active', true)
        .order('credits')
      if (!error) setPlans(data || [])
    }
    loadPlans()
  }, [])

  const selectedPlan = plans.find((p) => p.id === planId) || null
  const unitCount = orderType === 'subscription' ? (selectedPlan?.credits || 0) : 1
  const totalAmount = menuItem ? Number(menuItem.price) * unitCount : 0

  function resetForm() {
    setCustomer(null)
    setOrderType('one_time')
    setMenuItem(null)
    setPlanId('')
    setStartDate(addDaysToDateString(todayDateString(), 1))
    setPaymentStatus('not_paid')
    setPaymentMode('cash')
    setNotes('')
  }

  function validate() {
    if (!customer) return 'Please select or create a customer.'
    if (!menuItem) return 'Please select a menu item.'
    if (orderType === 'subscription' && !selectedPlan) return 'Please select a plan for the subscription.'
    if (!startDate) return 'Please pick a delivery date.'
    if (startDate < todayDateString()) return 'Delivery date cannot be in the past.'
    if (totalAmount <= 0) return 'Total amount must be greater than zero.'
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    const { error } = await supabase.rpc('create_order_with_deliveries', {
      p_customer_id: customer.id,
      p_menu_item_id: menuItem.id,
      p_order_type: orderType,
      p_plan_id: orderType === 'subscription' ? selectedPlan.id : null,
      p_plan_credits: orderType === 'subscription' ? selectedPlan.credits : null,
      p_total_amount: totalAmount,
      p_payment_status: paymentStatus,
      p_payment_mode: paymentMode,
      p_notes: notes.trim() || null,
      p_start_date: startDate,
    })
    setSubmitting(false)

    if (error) {
      setError(`Failed to log order: ${error.message}`)
      return
    }

    setSuccess(
      orderType === 'subscription'
        ? `Order logged! ${selectedPlan.credits} deliveries scheduled starting ${startDate}.`
        : `Order logged! Delivery scheduled for ${startDate}.`
    )
    resetForm()
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm border p-6">
      <h1 className="text-xl font-bold mb-4">New Order</h1>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Customer</label>
          <CustomerPicker selectedCustomer={customer} onSelect={setCustomer} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Order Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={orderType === 'one_time'}
                onChange={() => { setOrderType('one_time'); setPlanId('') }}
              />
              One-time order
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={orderType === 'subscription'}
                onChange={() => setOrderType('subscription')}
              />
              Subscription
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Menu Item</label>
          <MenuPicker selectedItem={menuItem} onSelect={setMenuItem} />
        </div>

        {orderType === 'subscription' && (
          <div>
            <label className="block text-sm font-medium mb-1">Plan</label>
            {plans.length === 0 ? (
              <p className="text-sm text-amber-600">No active plans found. Add some in Supabase - plans.</p>
            ) : (
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select a plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.credits} credits)</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            {orderType === 'subscription' ? 'Delivery Start Date' : 'Delivery Date'}
          </label>
          <input
            type="date"
            value={startDate}
            min={todayDateString()}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="not_paid">Not Paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Allergies, gate code, delivery instructions..."
          />
        </div>

        <div className="border-t pt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-2xl font-bold text-green-700">Rs.{totalAmount.toFixed(2)}</p>
            {orderType === 'subscription' && selectedPlan && menuItem && (
              <p className="text-xs text-gray-400">
                Rs.{Number(menuItem.price).toFixed(2)} x {selectedPlan.credits} meals
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-green-600 text-white px-5 py-2.5 rounded-md font-medium disabled:opacity-50"
          >
            {submitting ? 'Logging Order...' : 'Log Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
