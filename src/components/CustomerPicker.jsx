import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function CustomerPicker({ selectedCustomer, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', contact: '', address: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!query.trim() || selectedCustomer) {
      setResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, contact, address')
        .or(`name.ilike.%${query}%,contact.ilike.%${query}%`)
        .limit(8)
      if (!error) setResults(data || [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, selectedCustomer])

  async function handleCreate() {
    setError('')
    if (!newCustomer.name.trim() || !newCustomer.contact.trim() || !newCustomer.address.trim()) {
      setError('Name, contact, and address are all required.')
      return
    }
    setCreating(true)
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: newCustomer.name.trim(),
        contact: newCustomer.contact.trim(),
        address: newCustomer.address.trim(),
      })
      .select()
      .single()
    setCreating(false)

    if (error) {
      setError(error.message)
      return
    }
    onSelect(data)
    setShowNewForm(false)
    setNewCustomer({ name: '', contact: '', address: '' })
  }

  if (selectedCustomer) {
    return (
      <div className="border rounded-md p-3 bg-green-50 border-green-200 flex justify-between items-center">
        <div>
          <p className="font-medium text-sm">{selectedCustomer.name}</p>
          <p className="text-xs text-gray-600">
            {selectedCustomer.contact} - {selectedCustomer.address}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-xs text-red-600 hover:underline"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div>
      {!showNewForm ? (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer by name or phone..."
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
          {searching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
          {results.length > 0 && (
            <div className="border rounded-md mt-1 max-h-48 overflow-y-auto">
              {results.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => { onSelect(c); setQuery('') }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                >
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.contact}</p>
                </button>
              ))}
            </div>
          )}
          {query.trim() && !searching && results.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">No matches found.</p>
          )}
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="text-xs text-green-700 font-medium mt-2 hover:underline"
          >
            + Create new customer
          </button>
        </>
      ) : (
        <div className="border rounded-md p-3 space-y-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <input
            type="text"
            placeholder="Full name"
            value={newCustomer.name}
            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Phone number"
            value={newCustomer.contact}
            onChange={(e) => setNewCustomer({ ...newCustomer, contact: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Delivery address"
            value={newCustomer.address}
            onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={creating}
              onClick={handleCreate}
              className="bg-green-600 text-white text-sm px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              {creating ? 'Saving...' : 'Save Customer'}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setError('') }}
              className="text-sm px-3 py-1.5 rounded-md border"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
