$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-Utf8NoBom {
  param([string]$Path, [string]$Content)
  $fullPath = Join-Path $PWD $Path
  $folder = Split-Path $fullPath -Parent
  if (-not (Test-Path $folder)) { New-Item -ItemType Directory -Force -Path $folder | Out-Null }
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8NoBom)
}

Write-Utf8NoBom "src/pages/NewOrder.jsx" @'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString, addDaysToDateString } from '../lib/date'
import CustomerPicker from '../components/CustomerPicker'
import Alert from '../components/Alert'

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

function calculateDeliveryFee(distanceKm) {
  const d = Number(distanceKm)
  if (isNaN(d) || d < 0) return 0
  const rounded = Math.ceil(d * 10) / 10
  if (rounded <= 1.0) return 5.0
  const extraKm = Math.floor(rounded) - 1
  const hundreds = Math.round((rounded - Math.floor(rounded)) * 10)
  return 5.0 + (extraKm * 4.0) + (hundreds * 0.3)
}

export default function NewOrder() {
  const [customer, setCustomer] = useState(null)
  const [orderType, setOrderType] = useState('subscription')

  // Catalog Data
  const [groups, setGroups] = useState([])
  const [offers, setOffers] = useState([])
  const [menuItems, setMenuItems] = useState([])

  // Form State
  const [groupId, setGroupId] = useState('')
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [offerId, setOfferId] = useState('')
  const [addonId, setAddonId] = useState('')
  
  const [mealSlot, setMealSlot] = useState('lunch')
  const [startDate, setStartDate] = useState(addDaysToDateString(todayDateString(), 1))
  const [distance, setDistance] = useState('')
  const [instructions, setInstructions] = useState('')

  // One Time State
  const [oneTimeMenuId, setOneTimeMenuId] = useState('')
  const [oneTimeAmount, setOneTimeAmount] = useState('')
  const [specialReason, setSpecialReason] = useState('')

  // Payment State
  const [amountReceived, setAmountReceived] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')

  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function load() {
      const [grpRes, offRes, menuRes] = await Promise.all([
        supabase.from('pricing_groups').select('*').eq('active', true).order('name'),
        supabase.from('subscription_offers').select('*, menu_items(name), plans(name, duration_days)').eq('active', true),
        supabase.from('menu_items').select('*').eq('active', true).order('name')
      ])
      if (grpRes.data) setGroups(grpRes.data)
      if (offRes.data) setOffers(offRes.data)
      if (menuRes.data) setMenuItems(menuRes.data)
    }
    load()
  }, [])

  // Derived Cascading Values
  const activeGroup = groups.find(g => g.id === groupId)
  const isStudent = activeGroup?.code === 'student'
  
  const mainOffers = offers.filter(o => o.pricing_group_id === groupId && (o.offer_kind === 'main_meal' || o.offer_kind === 'standalone_snack'))
  
  // Extract unique menu items for the selected group
  const uniqueMenuItems = []
  const seenMenuIds = new Set()
  for (const offer of mainOffers) {
    if (!seenMenuIds.has(offer.menu_item_id)) {
      seenMenuIds.add(offer.menu_item_id)
      uniqueMenuItems.push({ id: offer.menu_item_id, name: offer.menu_items?.name })
    }
  }

  // Filter plans available for the specifically selected menu item
  const availablePlansForMenu = mainOffers.filter(o => o.menu_item_id === selectedMenuId)
  
  const activeOffer = offers.find(o => o.id === offerId)
  const availableAddons = offers.filter(o => o.pricing_group_id === groupId && o.offer_kind === 'snack_addon' && o.plan_id === activeOffer?.plan_id)

  useEffect(() => {
    if (isStudent) setMealSlot('lunch')
  }, [isStudent])

  let deliveryFeePerMeal = 0
  if (activeOffer?.delivery_fee_policy === 'distance') {
    deliveryFeePerMeal = calculateDeliveryFee(distance)
  } else if (orderType === 'one_time') {
    deliveryFeePerMeal = calculateDeliveryFee(distance)
  }

  let totalAmount = 0
  if (orderType === 'subscription' && activeOffer) {
    const totalDelFee = deliveryFeePerMeal * activeOffer.included_credits
    totalAmount = Number(activeOffer.package_price) + totalDelFee
    if (addonId) {
      const addon = offers.find(o => o.id === addonId)
      if (addon) totalAmount += Number(addon.package_price)
    }
  } else if (orderType === 'one_time') {
    totalAmount = Number(oneTimeAmount || 0) + deliveryFeePerMeal
  }

  function resetForm() {
    setCustomer(null)
    setOfferId('')
    setSelectedMenuId('')
    setAddonId('')
    setStartDate(addDaysToDateString(todayDateString(), 1))
    setDistance('')
    setInstructions('')
    setAmountReceived('')
    setOneTimeMenuId('')
    setOneTimeAmount('')
    setSpecialReason('')
  }

  async function handleVerifyStudent() {
    if (!customer) return
    setVerifying(true)
    setError('')
    const { error } = await supabase.from('customers').update({ student_verification_status: 'verified' }).eq('id', customer.id)
    setVerifying(false)
    if (error) {
      setError(`Verification failed: ${error.message}`)
    } else {
      setCustomer({ ...customer, student_verification_status: 'verified' })
      setSuccess('Customer instantly verified as a student!')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!customer) return setError('Select a customer.')
    
    if (orderType === 'subscription') {
      if (!offerId) return setError('Select a package plan.')
      if (isStudent && customer.student_verification_status !== 'verified') {
        return setError('Customer must be verified to process a student plan.')
      }
    } else {
      if (!oneTimeMenuId) return setError('Select a menu item.')
      if (!oneTimeAmount || Number(oneTimeAmount) <= 0) return setError('Enter valid approved food amount.')
    }

    setSubmitting(true)

    let result
    if (orderType === 'subscription') {
      result = await supabase.rpc('create_catalog_subscription', {
        p_customer_id: customer.id,
        p_offer_id: offerId,
        p_meal_slot: mealSlot,
        p_start_date: startDate,
        p_delivery_distance_km: Number(distance || 0),
        p_amount_received: Number(amountReceived || 0),
        p_payment_mode: paymentMode,
        p_instructions: instructions,
        p_snack_addon_offer_id: addonId || null
      })
    } else {
      result = await supabase.rpc('create_special_one_time_order', {
        p_customer_id: customer.id,
        p_menu_item_id: oneTimeMenuId,
        p_meal_slot: mealSlot,
        p_delivery_date: startDate,
        p_delivery_distance_km: Number(distance || 0),
        p_food_amount: Number(oneTimeAmount),
        p_amount_received: Number(amountReceived || 0),
        p_payment_mode: paymentMode,
        p_notes: instructions,
        p_special_request_reason: specialReason
      })
    }

    setSubmitting(false)

    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess('Order successfully logged in the catalog system!')
      resetForm()
    }
  }

  const needsVerification = isStudent && customer && customer.student_verification_status !== 'verified'

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm border p-6">
      <h1 className="text-xl font-bold mb-4">New Order</h1>
      
      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Customer</label>
          <CustomerPicker selectedCustomer={customer} onSelect={setCustomer} />
          
          {needsVerification && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-amber-800">Student ID Verification Required</p>
                <p className="text-xs text-amber-700">Review their ID via WhatsApp, then approve here.</p>
              </div>
              <button 
                type="button" 
                onClick={handleVerifyStudent} 
                disabled={verifying}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded disabled:opacity-50"
              >
                {verifying ? 'Verifying...' : 'Approve Status'}
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Order Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={orderType === 'subscription'} onChange={() => setOrderType('subscription')} />
              Subscription
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={orderType === 'one_time'} onChange={() => setOrderType('one_time')} />
              Special One-Time
            </label>
          </div>
        </div>

        {orderType === 'subscription' ? (
          <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">1. Pricing Group</label>
              <select 
                value={groupId} 
                onChange={e => { setGroupId(e.target.value); setSelectedMenuId(''); setOfferId(''); setAddonId(''); }} 
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">Select Regular or Student...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            
            {groupId && (
              <div>
                <label className="block text-sm font-medium mb-1">2. Menu Item</label>
                <select 
                  value={selectedMenuId} 
                  onChange={e => { setSelectedMenuId(e.target.value); setOfferId(''); setAddonId(''); }} 
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select Cuisine / Pack...</option>
                  {uniqueMenuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}

            {selectedMenuId && (
              <div>
                <label className="block text-sm font-medium mb-1">3. Plan Duration & Price</label>
                <select 
                  value={offerId} 
                  onChange={e => { setOfferId(e.target.value); setAddonId(''); }} 
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white font-medium"
                >
                  <option value="">Select Plan...</option>
                  {availablePlansForMenu.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.plans?.name} — ₹{o.package_price}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeOffer && availableAddons.length > 0 && (
              <div className="border-t pt-4 mt-2">
                <label className="block text-sm font-medium mb-1">4. Snack Add-on (Optional)</label>
                <select value={addonId} onChange={e => setAddonId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                  <option value="">None</option>
                  {availableAddons.map(o => <option key={o.id} value={o.id}>{o.menu_items?.name} (+ ₹{o.package_price})</option>)}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <p className="text-xs text-amber-800">One-time orders are for special requests only. Distance delivery fees apply.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Menu Item</label>
              <select value={oneTimeMenuId} onChange={e => setOneTimeMenuId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                <option value="">Select Item...</option>
                {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Approved Food Amount (₹)</label>
              <input type="number" min="0" step="0.01" value={oneTimeAmount} onChange={e => setOneTimeAmount(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason for Special Request</label>
              <input type="text" value={specialReason} onChange={e => setSpecialReason(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white" placeholder="e.g. VIP client request" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Meal Slot</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={mealSlot === 'lunch'} onChange={() => setMealSlot('lunch')} /> Lunch
            </label>
            <label className={`flex items-center gap-2 text-sm ${isStudent ? 'text-gray-400' : ''}`}>
              <input type="radio" checked={mealSlot === 'dinner'} onChange={() => setMealSlot('dinner')} disabled={isStudent} /> Dinner
            </label>
          </div>
          {isStudent && <p className="text-xs text-amber-600 mt-1">Student plans are restricted to Lunch only.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Delivery Distance (km)</label>
          <input type="number" min="0" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" placeholder="e.g. 1.5" />
          {deliveryFeePerMeal > 0 && <p className="text-xs text-gray-500 mt-1">Delivery Fee: ₹{deliveryFeePerMeal.toFixed(2)} per delivery</p>}
          {activeOffer?.delivery_fee_policy === 'included' && <p className="text-xs text-green-600 mt-1">Delivery is included/free for this offer.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input type="date" value={startDate} min={todayDateString()} onChange={e => setStartDate(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Instructions / Notes</label>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" rows="2" placeholder="Dietary notes, gate code..." />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t pt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount Received (₹)</label>
            <input type="number" min="0" step="0.01" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Mode</label>
            <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
              {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-sm text-gray-500">Total Amount Due</p>
            <p className="text-2xl font-bold text-green-700">₹{totalAmount.toFixed(2)}</p>
          </div>
          <button 
            type="submit" 
            disabled={submitting || needsVerification} 
            className="bg-green-600 text-white px-5 py-2.5 rounded-md font-medium disabled:opacity-50"
          >
            {submitting ? 'Processing...' : 'Log Order'}
          </button>
        </div>

      </form>
    </div>
  )
}
'@
[System.IO.File]::WriteAllText("$PWD\src\pages\NewOrder.jsx", $NewOrderCode, $utf8NoBom)
Write-Host "✅ NewOrder.jsx has been rewritten with cascading dropdowns and instant student verification." -ForegroundColor Green