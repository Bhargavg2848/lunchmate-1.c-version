import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString, addDaysToDateString } from '../lib/date'
import CustomerPicker from '../components/CustomerPicker'
import Alert from '../components/Alert'

// Map Imports
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default Leaflet icons in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

// --- EDITABLE DELIVERY RATES ---
// Matches your: 1km=₹5, 1.1km=₹5.30, 2km=₹9, 3km=₹13 logic
const DELIVERY_RATES = {
  baseFee: 5.00,             // Fee for the first X kilometers
  baseDistanceKm: 1.0,       // The distance included in the base fee
  feePerExtraFullKm: 4.00,   // Fee for every FULL extra kilometer beyond the base
  feePerExtra100m: 0.30      // Fee for every extra 0.1 km (100 meters)
};

function calculateDeliveryFee(distanceKm) {
  const d = Number(distanceKm);
  if (isNaN(d) || d <= 0) return 0;
  
  // Round to nearest 1 decimal place (e.g., 1.14 -> 1.1, 1.15 -> 1.2)
  const rounded = Math.round(d * 10) / 10;
  
  if (rounded <= DELIVERY_RATES.baseDistanceKm) {
    return DELIVERY_RATES.baseFee;
  }
  
  // Calculate extra full kilometers
  const extraKm = Math.floor(rounded) - DELIVERY_RATES.baseDistanceKm;
  
  // Calculate remaining hundreds of meters
  const hundreds = Math.round((rounded - Math.floor(rounded)) * 10);
  
  return DELIVERY_RATES.baseFee + (extraKm * DELIVERY_RATES.feePerExtraFullKm) + (hundreds * DELIVERY_RATES.feePerExtra100m);
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

  // Map State
  // Sriram Nagar Hub Coordinates (Exact match to Google Maps link)
  const KITCHEN_COORDS = [16.9702, 82.2332] 
  const [destinationCoords, setDestinationCoords] = useState(null)
  const [routePath, setRoutePath] = useState([])

  // One Time State
  const [oneTimeMenuId, setOneTimeMenuId] = useState('')
  const [oneTimeAmount, setOneTimeAmount] = useState('')
  const [specialReason, setSpecialReason] = useState('')

  // Payment State
  const [amountReceived, setAmountReceived] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')

  // UI State
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [calculatingRoute, setCalculatingRoute] = useState(false) 
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

  // Auto-trigger Routing Engine & Update Map
  useEffect(() => {
    async function autoCalculateDistance() {
      const addressToRoute = customer?.address || customer?.customer_address
      
      if (addressToRoute) {
        setCalculatingRoute(true)
        setDestinationCoords(null)
        setRoutePath([])
        
        try {
          const { data, error } = await supabase.functions.invoke('calculate-delivery', {
            body: { destination: addressToRoute }
          })
          
          if (!error && data) {
            if (data.distance_km) setDistance(data.distance_km)
            
            // Map the coordinates returned from the backend API
            if (data.destination_coords) {
               setDestinationCoords([data.destination_coords.lat, data.destination_coords.lng])
            }
            if (data.route_points) {
               setRoutePath(data.route_points)
            }
          }
        } catch (err) {
          console.error("Routing engine failed to auto-calculate:", err)
        }
        setCalculatingRoute(false)
      }
    }

    if (customer) {
      autoCalculateDistance()
    } else {
      setDistance('')
      setDestinationCoords(null)
      setRoutePath([])
    }
  }, [customer])

  // Derived Cascading Values
  const activeGroup = groups.find(g => g.id === groupId)
  const isStudent = activeGroup?.code === 'student'
  
  const mainOffers = offers.filter(o => o.pricing_group_id === groupId && (o.offer_kind === 'main_meal' || o.offer_kind === 'standalone_snack'))
  
  const uniqueMenuItems = []
  const seenMenuIds = new Set()
  for (const offer of mainOffers) {
    if (!seenMenuIds.has(offer.menu_item_id)) {
      seenMenuIds.add(offer.menu_item_id)
      uniqueMenuItems.push({ id: offer.menu_item_id, name: offer.menu_items?.name })
    }
  }

  const availablePlansForMenu = mainOffers.filter(o => o.menu_item_id === selectedMenuId)
  const activeOffer = offers.find(o => o.id === offerId)
  const availableAddons = offers.filter(o => o.pricing_group_id === groupId && o.offer_kind === 'snack_addon' && o.plan_id === activeOffer?.plan_id)

  useEffect(() => {
    if (isStudent) setMealSlot('lunch')
  }, [isStudent])

  let deliveryFeePerMeal = 0
  if (activeOffer?.delivery_fee_policy === 'distance' || orderType === 'one_time') {
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
    setDestinationCoords(null)
    setRoutePath([])
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

        {/* DISTANCE INPUT & VISUAL MAP MODULE */}
        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
          <div className="flex justify-between items-end mb-2">
            <label className="block text-sm font-bold text-gray-800">Routing & Delivery Distance (km)</label>
            {calculatingRoute && (
              <span className="text-xs font-semibold text-blue-600 animate-pulse">🛰️ Generating map...</span>
            )}
          </div>
          
          <input 
            type="number" 
            min="0" 
            step="0.1" 
            value={distance} 
            onChange={e => setDistance(e.target.value)} 
            className="w-full border rounded-md px-3 py-2 text-sm bg-white shadow-inner mb-3" 
            placeholder="e.g. 1.5" 
          />

          {/* Render the Map Box */}
          <div className="w-full h-48 bg-gray-200 rounded-md border border-gray-300 overflow-hidden relative z-0">
            <MapContainer 
              center={destinationCoords || KITCHEN_COORDS} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Kitchen Marker */}
              <Marker position={KITCHEN_COORDS}>
                <Popup>Lunchmate Kitchen</Popup>
              </Marker>

              {/* Destination Marker */}
              {destinationCoords && (
                <Marker position={destinationCoords}>
                  <Popup>Customer Location</Popup>
                </Marker>
              )}

              {/* Route Line */}
              {routePath.length > 0 && (
                <Polyline positions={routePath} color="blue" weight={4} opacity={0.7} />
              )}
            </MapContainer>
          </div>

          {deliveryFeePerMeal > 0 && !calculatingRoute && (
            <p className="text-sm font-bold text-indigo-700 mt-3 text-right">
              Delivery Fee: ₹{deliveryFeePerMeal.toFixed(2)} / meal
            </p>
          )}
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
            disabled={submitting || needsVerification || calculatingRoute} 
            className="bg-green-600 hover:bg-green-700 transition-colors text-white px-5 py-2.5 rounded-md font-medium disabled:opacity-50"
          >
            {submitting ? 'Processing...' : 'Log Order'}
          </button>
        </div>

      </form>
    </div>
  )
}