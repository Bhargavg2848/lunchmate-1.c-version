# Script B - Pages + GitHub Actions Deploy

@'
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
'@ | Set-Content -Encoding UTF8 src/pages/NewOrder.jsx

@'
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
'@ | Set-Content -Encoding UTF8 src/pages/Deliveries.jsx

@'
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
'@ | Set-Content -Encoding UTF8 .github/workflows/deploy.yml

Write-Host "Script B done - NewOrder, Deliveries, deploy.yml created" -ForegroundColor Green
Get-ChildItem -Recurse -File | Select-Object FullName