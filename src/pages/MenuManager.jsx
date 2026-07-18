import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Alert from '../components/Alert'

export default function MenuManager() {
  // Main State
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Dropdown Data State
  const [menuItems, setMenuItems] = useState([])
  const [plans, setPlans] = useState([])
  const [pricingGroups, setPricingGroups] = useState([])
  
  // Edit State
  const [editingId, setEditingId] = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [editCredits, setEditCredits] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Add New State
  const [showAddForm, setShowAddForm] = useState(false)
  const [newOffer, setNewOffer] = useState({
    offer_code: '',
    pricing_group_id: '',
    menu_item_id: '',
    plan_id: '',
    offer_kind: 'main_meal',
    package_price: '',
    included_credits: '',
    delivery_fee_policy: 'distance',
    active: true
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  async function fetchAllData() {
    setLoading(true)
    try {
      // Fetch Offers
      const { data: offersData, error: offersError } = await supabase
        .from('subscription_offers')
        .select(`id, offer_code, package_price, included_credits, active, menu_items ( name ), plans ( name )`)
        .order('offer_code', { ascending: true })
      if (offersError) throw offersError

      // Fetch Menu Items (for dropdown)
      const { data: menuData } = await supabase.from('menu_items').select('id, name').order('name')
      // Fetch Plans (for dropdown)
      const { data: plansData } = await supabase.from('plans').select('id, name').order('name')
      // Fetch Pricing Groups (for dropdown)
      const { data: groupsData } = await supabase.from('pricing_groups').select('id, code')

      setOffers(offersData || [])
      setMenuItems(menuData || [])
      setPlans(plansData || [])
      setPricingGroups(groupsData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- DELETE LOGIC ---
  async function deleteOffer(id) {
    if (!window.confirm('Are you sure you want to delete this menu package? This cannot be undone.')) return
    
    setError('')
    setSuccess('')
    try {
      const { error } = await supabase.from('subscription_offers').delete().eq('id', id)
      if (error) throw error
      
      setSuccess('Package deleted successfully.')
      fetchAllData()
    } catch (err) {
      setError(err.message)
    }
  }

  // --- ADD LOGIC ---
  async function handleAddSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.from('subscription_offers').insert([{
        offer_code: newOffer.offer_code,
        pricing_group_id: newOffer.pricing_group_id,
        menu_item_id: newOffer.menu_item_id,
        plan_id: newOffer.plan_id,
        offer_kind: newOffer.offer_kind,
        package_price: parseFloat(newOffer.package_price),
        included_credits: parseInt(newOffer.included_credits),
        delivery_fee_policy: newOffer.delivery_fee_policy,
        active: newOffer.active
      }])

      if (error) throw error
      
      setSuccess('New package added successfully!')
      setShowAddForm(false)
      // Reset form
      setNewOffer({
        offer_code: '', pricing_group_id: '', menu_item_id: '', plan_id: '',
        offer_kind: 'main_meal', package_price: '', included_credits: '', delivery_fee_policy: 'distance', active: true
      })
      fetchAllData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // --- EDIT LOGIC ---
  function startEdit(offer) {
    setEditingId(offer.id)
    setEditPrice(offer.package_price)
    setEditCredits(offer.included_credits)
    setEditActive(offer.active)
  }

  async function saveEdit(id) {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { error } = await supabase.from('subscription_offers').update({
        package_price: parseFloat(editPrice),
        included_credits: parseInt(editCredits),
        active: editActive
      }).eq('id', id)
      if (error) throw error
      
      setSuccess('Menu package updated successfully!')
      setEditingId(null)
      fetchAllData() 
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-500">Loading Menu Data...</div>

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu & Pricing Manager</h1>
          <p className="text-gray-500">Add, edit, or remove your active plans</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {showAddForm ? 'Cancel Adding' : '+ Add New Package'}
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* --- ADD NEW FORM (Only visible when button clicked) --- */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Create New Package</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Offer Code (Unique ID)</label>
              <input required type="text" value={newOffer.offer_code} onChange={e => setNewOffer({...newOffer, offer_code: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500" placeholder="e.g., regular_veg_north_5" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience (Pricing Group)</label>
              <select required value={newOffer.pricing_group_id} onChange={e => setNewOffer({...newOffer, pricing_group_id: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500">
                <option value="">Select Group...</option>
                {pricingGroups.map(pg => <option key={pg.id} value={pg.id}>{pg.code}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Menu Item (Food)</label>
              <select required value={newOffer.menu_item_id} onChange={e => setNewOffer({...newOffer, menu_item_id: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500">
                <option value="">Select Food Item...</option>
                {menuItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration/Plan Type</label>
              <select required value={newOffer.plan_id} onChange={e => setNewOffer({...newOffer, plan_id: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500">
                <option value="">Select Base Plan...</option>
                {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input required type="number" min="0" value={newOffer.package_price} onChange={e => setNewOffer({...newOffer, package_price: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Credits</label>
              <input required type="number" min="1" value={newOffer.included_credits} onChange={e => setNewOffer({...newOffer, included_credits: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500" />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium">
              {saving ? 'Creating...' : 'Save New Package'}
            </button>
          </div>
        </form>
      )}

      {/* --- DATA TABLE --- */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Offer Code / Details</th>
                <th className="px-6 py-4">Base Plan</th>
                <th className="px-6 py-4">Credits</th>
                <th className="px-6 py-4">Price (₹)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {offers.map((offer) => (
                <tr key={offer.id} className={!offer.active && editingId !== offer.id ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50'}>
                  
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{offer.offer_code}</div>
                    <div className="text-xs text-gray-500">{offer.menu_items?.name}</div>
                  </td>
                  
                  <td className="px-6 py-4 text-gray-700">{offer.plans?.name}</td>
                  
                  {/* Credits Column */}
                  <td className="px-6 py-4">
                    {editingId === offer.id ? (
                      <input type="number" value={editCredits} onChange={(e) => setEditCredits(e.target.value)} className="w-20 border rounded px-2 py-1 text-sm focus:ring-green-500 focus:border-green-500" />
                    ) : (
                      <span className="font-medium text-gray-900">{offer.included_credits}</span>
                    )}
                  </td>

                  {/* Price Column */}
                  <td className="px-6 py-4">
                    {editingId === offer.id ? (
                      <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-24 border rounded px-2 py-1 text-sm focus:ring-green-500 focus:border-green-500" />
                    ) : (
                      <span className="font-bold text-green-700">₹{offer.package_price}</span>
                    )}
                  </td>

                  {/* Status Column */}
                  <td className="px-6 py-4">
                    {editingId === offer.id ? (
                      <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="rounded text-green-600 focus:ring-green-500 w-4 h-4 mr-2" />
                        <span className="text-sm">Active</span>
                      </label>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${offer.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {offer.active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td className="px-6 py-4 text-right">
                    {editingId === offer.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-xs font-medium px-2 py-1">Cancel</button>
                        <button onClick={() => saveEdit(offer.id)} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1 rounded">Save</button>
                      </div>
                    ) : (
                      <div className="flex justify-end items-center gap-4">
                        <button onClick={() => startEdit(offer)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                        <button onClick={() => deleteOffer(offer.id)} className="text-red-500 hover:text-red-700 text-sm font-medium" title="Delete Package">
                          {/* Trash Icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}