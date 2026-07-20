import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { todayDateString, addDaysToDateString } from '../lib/date'
import CustomerPicker from '../components/CustomerPicker'
import Alert from '../components/Alert'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
mapboxgl.accessToken = MAPBOX_TOKEN

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

const DELIVERY_RATES = { baseFee: 5.00, baseDistanceKm: 1.0, feePerExtraFullKm: 4.00, feePerExtra100m: 0.30 };
const KITCHEN_COORDS = { lat: 16.968230, lng: 82.234376 };

function calculateDeliveryFee(distanceKm) {
  const d = Number(distanceKm);
  if (isNaN(d) || d <= 0) return 0;
  const rounded = Math.round(d * 10) / 10;
  if (rounded <= DELIVERY_RATES.baseDistanceKm) return DELIVERY_RATES.baseFee;
  const extraKm = Math.floor(rounded) - DELIVERY_RATES.baseDistanceKm;
  const hundreds = Math.round((rounded - Math.floor(rounded)) * 10);
  return DELIVERY_RATES.baseFee + (extraKm * DELIVERY_RATES.feePerExtraFullKm) + (hundreds * DELIVERY_RATES.feePerExtra100m);
}

export default function NewOrder() {
  // Form State
  const [customer, setCustomer] = useState(null)
  const [orderType, setOrderType] = useState('subscription')
  const [orderSource, setOrderSource] = useState('HM')
  
  // Data State
  const [groups, setGroups] = useState([])
  const [offers, setOffers] = useState([])
  const [menuItems, setMenuItems] = useState([])
  
  // Subscription Selections
  const [groupId, setGroupId] = useState('')
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [offerId, setOfferId] = useState('')
  const [addonId, setAddonId] = useState('')
  
  // One-Time Selections
  const [oneTimeMenuId, setOneTimeMenuId] = useState('')
  const [oneTimeAmount, setOneTimeAmount] = useState('')
  const [specialReason, setSpecialReason] = useState('')
  
  // Logistics & Payment
  const [mealSlot, setMealSlot] = useState('lunch')
  const [startDate, setStartDate] = useState(addDaysToDateString(todayDateString(), 1))
  const [distance, setDistance] = useState('')
  const [calculatingDistance, setCalculatingDistance] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [amountReceived, setAmountReceived] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')
  
  // UI State
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Mapbox Refs
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markerKitchen = useRef(null)
  const markerCustomer = useRef(null)

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

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [KITCHEN_COORDS.lng, KITCHEN_COORDS.lat],
        zoom: 14
      });
      
      markerKitchen.current = new mapboxgl.Marker({ color: '#3b82f6' }) 
        .setLngLat([KITCHEN_COORDS.lng, KITCHEN_COORDS.lat])
        .addTo(map.current);
    }

    const resizeObserver = new ResizeObserver(() => {
      if (map.current) {
        map.current.resize();
      }
    });
    resizeObserver.observe(mapContainer.current);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!map.current) return;

    if (customer?.latitude && customer?.longitude) {
      setCalculatingDistance(true)
      
      const getDist = async () => {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${KITCHEN_COORDS.lng},${KITCHEN_COORDS.lat};${customer.longitude},${customer.latitude}?access_token=${MAPBOX_TOKEN}`
        try {
          const res = await fetch(url)
          const data = await res.json()
          if (data.routes?.[0]) {
            setDistance((data.routes[0].distance / 1000).toFixed(1))
          }
        } catch (e) { 
          console.error("Mapbox distance fetch failed", e) 
        }
        setCalculatingDistance(false)
      }
      getDist()

      if (!markerCustomer.current) {
        markerCustomer.current = new mapboxgl.Marker({ color: '#ef4444' }) 
          .setLngLat([customer.longitude, customer.latitude])
          .addTo(map.current)
      } else {
        markerCustomer.current.setLngLat([customer.longitude, customer.latitude])
      }
      
      const bounds = new mapboxgl.LngLatBounds()
        .extend([KITCHEN_COORDS.lng, KITCHEN_COORDS.lat])
        .extend([customer.longitude, customer.latitude]);
        
      map.current.fitBounds(bounds, { padding: 50 });
      
    } else {
      setDistance('')
      if (markerCustomer.current) {
        markerCustomer.current.remove()
        markerCustomer.current = null
      }
      map.current.flyTo({ center: [KITCHEN_COORDS.lng, KITCHEN_COORDS.lat], zoom: 14 })
    }
  }, [customer])

  const activeGroup = groups.find(g => g.id === groupId)
  const isStudent = activeGroup?.code === 'student' || activeGroup?.name?.toLowerCase().includes('student')
  
  const mainOffers = offers.filter(o => o.pricing_group_id === groupId && (o.offer_kind === 'main_meal' || o.offer_kind === 'standalone_snack'))
  const uniqueMenuItems = Array.from(new Set(mainOffers.map(o => o.menu_item_id))).map(id => ({ id, name: mainOffers.find(o => o.menu_item_id === id).menu_items.name }))
  const availablePlansForMenu = mainOffers.filter(o => o.menu_item_id === selectedMenuId)
  const activeOffer = offers.find(o => o.id === offerId)
  const availableAddons = offers.filter(o => o.pricing_group_id === groupId && o.offer_kind === 'snack_addon' && o.plan_id === activeOffer?.plan_id)

  useEffect(() => { 
    if (isStudent) setMealSlot('lunch') 
  }, [isStudent])

  let deliveryFeePerMeal = calculateDeliveryFee(distance)
  if (isStudent) deliveryFeePerMeal = 0; 

  let totalAmount = 0
  if (orderType === 'subscription' && activeOffer) {
    totalAmount = Number(activeOffer.package_price) + (deliveryFeePerMeal * activeOffer.included_credits)
    if (addonId) {
        totalAmount += Number(offers.find(o => o.id === addonId)?.package_price || 0)
    }
  } else if (orderType === 'one_time') {
    totalAmount = Number(oneTimeAmount || 0) + deliveryFeePerMeal
  }

  // --- NEW FUNCTION: VERIFY STUDENT INLINE ---
  async function handleVerifyStudent() {
    if (!customer?.id) return;
    setVerifying(true);
    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update({ student_verification_status: 'verified' })
        .eq('id', customer.id);
      
      if (updateError) throw updateError;
      
      // Update local state instantly so warning disappears
      setCustomer({ ...customer, student_verification_status: 'verified' });
      setSuccess('Customer successfully marked as verified!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to verify customer: ' + err.message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    
    if (!customer || !customer.id) {
      setError('Please select a valid customer before submitting. (Customer ID is missing)')
      setSubmitting(false)
      return
    }

    try {
      let res;
      if (orderType === 'subscription') {
        res = await supabase.rpc('create_catalog_subscription', {
          p_customer_id: customer.id,
          p_offer_id: offerId || null,
          p_meal_slot: mealSlot || null,
          p_start_date: startDate || null, 
          p_delivery_distance_km: Number(distance || 0),
          p_amount_received: Number(amountReceived || 0),
          p_payment_mode: paymentMode || null,
          p_instructions: instructions || null,
          p_snack_addon_offer_id: addonId || null,
          p_order_source: orderSource,
          p_original_total_amount: Number(totalAmount || 0)
        });
      } else {
        res = await supabase.rpc('create_special_one_time_order', {
          p_customer_id: customer.id,
          p_menu_item_id: oneTimeMenuId || null,
          p_meal_slot: mealSlot || null,
          p_delivery_date: startDate || null, 
          p_delivery_distance_km: Number(distance || 0),
          p_food_amount: Number(oneTimeAmount || 0),
          p_amount_received: Number(amountReceived || 0),
          p_payment_mode: paymentMode || null,
          p_notes: instructions || null,
          p_special_request_reason: specialReason || null,
          p_order_source: orderSource,
          p_original_total_amount: Number(totalAmount || 0)
        });
      }
      
      if (res.error) throw res.error;
      
      setSuccess('Order logged successfully!'); 
      setCustomer(null); setOfferId(''); setDistance(''); setInstructions(''); setAmountReceived('');
    } catch (err) { 
      setError(err.message) 
    }
    setSubmitting(false)
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm border p-6 mb-12">
      <h1 className="text-xl font-bold mb-4">New Order</h1>
      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Customer</label>
          <CustomerPicker selectedCustomer={customer} onSelect={setCustomer} />
          
          {customer && (
            <div className="mt-2 px-3 py-2 bg-gray-50 border rounded text-xs flex justify-between items-center">
              <span className="text-gray-600 font-medium">Verification Status:</span>
              <span className={`font-bold uppercase tracking-wider ${customer.student_verification_status === 'verified' ? 'text-green-600' : 'text-red-600'}`}>
                {customer.student_verification_status || 'NOT SUBMITTED'}
              </span>
            </div>
          )}
          
          {/* --- INLINE VERIFY BUTTON UI ADDED HERE --- */}
          {customer && isStudent && customer.student_verification_status !== 'verified' && (
             <div className="bg-red-50 border border-red-200 p-3 rounded-md mt-2 flex justify-between items-center">
                <p className="text-xs text-red-700 font-bold">
                   Warning: You are selecting a Student Plan, but this customer is not verified!
                </p>
                <button 
                   type="button" 
                   onClick={handleVerifyStudent} 
                   disabled={verifying}
                   className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded shadow-sm disabled:opacity-50 transition-colors shrink-0 ml-3"
                >
                   {verifying ? 'Updating...' : 'Verify Now'}
                </button>
             </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Order Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={orderType === 'subscription'} onChange={() => setOrderType('subscription')} /> Subscription
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={orderType === 'one_time'} onChange={() => setOrderType('one_time')} /> Special One-Time
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Order Source</label>
            <select value={orderSource} onChange={e => setOrderSource(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
              <option value="HM">Home</option>
              <option value="SH">School</option>
              <option value="CG">College</option>
              <option value="OF">Office</option>
              <option value="HS">Hostel</option>
              <option value="HP">Hospital</option>
              <option value="HT">Hotel</option>
            </select>
          </div>
        </div>

        {orderType === 'subscription' ? (
          <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
            <label className="block text-sm font-medium">1. Pricing Group</label>
            <select value={groupId} onChange={e => {setGroupId(e.target.value); setSelectedMenuId(''); setOfferId('');}} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                <option value="">Select Group...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            
            {groupId && (
              <>
                <label className="block text-sm font-medium mt-2">2. Menu Item</label>
                <select value={selectedMenuId} onChange={e => {setSelectedMenuId(e.target.value); setOfferId('');}} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                    <option value="">Select Menu...</option>
                    {uniqueMenuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </>
            )}
            
            {selectedMenuId && (
              <>
                <label className="block text-sm font-medium mt-2">3. Plan Duration & Price</label>
                <select value={offerId} onChange={e => setOfferId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                    <option value="">Select Plan...</option>
                    {availablePlansForMenu.map(o => <option key={o.id} value={o.id}>{o.plans?.name} - ₹{o.package_price}</option>)}
                </select>
              </>
            )}
            
            {activeOffer && availableAddons.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <label className="block text-sm font-medium mb-1">4. Snack Add-on (Optional)</label>
                <select value={addonId} onChange={e => setAddonId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                  <option value="">None</option>
                  {availableAddons.map(o => <option key={o.id} value={o.id}>{o.menu_items?.name} (+ ₹{o.package_price})</option>)}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
            <label className="block text-sm font-medium">Menu Item</label>
            <select value={oneTimeMenuId} onChange={e => setOneTimeMenuId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                <option value="">Select Item...</option>
                {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            
            <label className="block text-sm font-medium mt-2">Approved Food Amount (₹)</label>
            <input type="number" placeholder="Amount" value={oneTimeAmount} onChange={e => setOneTimeAmount(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white" />
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

        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
           <div className="flex justify-between items-end mb-2">
               <label className="block text-sm font-bold text-gray-800">Routing & Delivery Distance (km)</label>
               {calculatingDistance && <span className="text-xs font-semibold text-blue-600 animate-pulse">Calculating Mapbox route...</span>}
           </div>
           
           <input type="number" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white shadow-inner mb-3" placeholder="e.g. 1.5" />
           
           <div ref={mapContainer} className="w-full h-48 bg-gray-100 rounded-md overflow-hidden border border-gray-300 relative" />
           
           {isStudent && distance ? (
               <p className="text-sm font-bold text-green-700 mt-3 text-right">
                   Delivery Fee: Waived (Student Plan)
               </p>
           ) : deliveryFeePerMeal > 0 ? (
               <p className="text-sm font-bold text-indigo-700 mt-3 text-right">
                   Delivery Fee: ₹{deliveryFeePerMeal.toFixed(2)} / meal
               </p>
           ) : null}
        </div>

        <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input type="date" value={startDate} min={todayDateString()} onChange={e => setStartDate(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        
        <div>
            <label className="block text-sm font-medium mb-1">Instructions / Notes</label>
            <textarea placeholder="Dietary notes, gate code..." value={instructions} onChange={e => setInstructions(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" rows="2" />
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
          <button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700 transition-colors text-white px-5 py-2.5 rounded-md font-medium disabled:opacity-50">
              {submitting ? 'Processing...' : 'Log Order'}
          </button>
        </div>
      </form>
    </div>
  )
}