import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function MenuPicker({ selectedItem, onSelect }) {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [catRes, itemRes] = await Promise.all([
        supabase.from('menu_categories').select('id, name').order('sort_order'),
        supabase.from('menu_items').select('id, name, price, category_id').eq('active', true).order('name'),
      ])
      if (catRes.error || itemRes.error) {
        setError((catRes.error || itemRes.error).message)
      } else {
        setCategories(catRes.data || [])
        setItems(itemRes.data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const filteredItems = categoryId ? items.filter((i) => i.category_id === categoryId) : items

  if (loading) return <p className="text-sm text-gray-400">Loading menu...</p>
  if (error) return <p className="text-sm text-red-600">Error loading menu: {error}</p>
  if (items.length === 0)
    return (
      <p className="text-sm text-amber-600">
        No active menu items found. Add some in Supabase - menu_items.
      </p>
    )

  return (
    <div className="space-y-2">
      <select
        value={categoryId}
        onChange={(e) => { setCategoryId(e.target.value); onSelect(null) }}
        className="w-full border rounded-md px-3 py-2 text-sm"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select
        value={selectedItem?.id || ''}
        onChange={(e) => {
          const item = filteredItems.find((i) => i.id === e.target.value)
          onSelect(item || null)
        }}
        className="w-full border rounded-md px-3 py-2 text-sm"
      >
        <option value="">Select a menu item...</option>
        {filteredItems.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name} - Rs.{Number(i.price).toFixed(2)}
          </option>
        ))}
      </select>
    </div>
  )
}
