import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Alert from '../components/Alert'

export default function MenuManager() {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Edit State
  const [editingId, setEditingId] = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [editCredits, setEditCredits] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchOffers()
  }, [])

  async function fetchOffers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('subscription_offers')
        .select(`
          id,
          offer_code,
          package_price,
          included_credits,
          active,
          menu_items ( name ),
          plans ( name )
        `)
        .order('offer_code', { ascending: true })

      if (error) throw error
      setOffers(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(offer) {
    setEditingId(offer.id)
    setEditPrice(offer.package_price)
    setEditCredits(offer.included_credits)
    setEditActive(offer.active)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id) {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { error } = await supabase
        .from('subscription_offers')
        .update({
          package_price: parseFloat(editPrice),
          included_credits: parseInt(editCredits),
          active: editActive
        })
        .eq('id', id)

      if (error) throw error
      
      setSuccess('Menu package updated successfully!')
      setEditingId(null)
      fetchOffers() // Refresh the list
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-500">Loading Menu Packages...</div>

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu & Pricing Manager</h1>
          <p className="text-gray-500">Update your subscription prices and active plans</p>
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

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
                      <input 
                        type="number" 
                        value={editCredits} 
                        onChange={(e) => setEditCredits(e.target.value)}
                        className="w-20 border rounded px-2 py-1 text-sm focus:ring-green-500 focus:border-green-500"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">{offer.included_credits}</span>
                    )}
                  </td>

                  {/* Price Column */}
                  <td className="px-6 py-4">
                    {editingId === offer.id ? (
                      <input 
                        type="number" 
                        value={editPrice} 
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-24 border rounded px-2 py-1 text-sm focus:ring-green-500 focus:border-green-500"
                      />
                    ) : (
                      <span className="font-bold text-green-700">₹{offer.package_price}</span>
                    )}
                  </td>

                  {/* Status Column */}
                  <td className="px-6 py-4">
                    {editingId === offer.id ? (
                      <label className="flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editActive} 
                          onChange={(e) => setEditActive(e.target.checked)}
                          className="rounded text-green-600 focus:ring-green-500 w-4 h-4 mr-2"
                        />
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
                        <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 text-xs font-medium px-2 py-1">Cancel</button>
                        <button onClick={() => saveEdit(offer.id)} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1 rounded">
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(offer)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
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