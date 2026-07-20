import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// 1. Initialize Pure Mapbox (No Google needed!)
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
mapboxgl.accessToken = MAPBOX_TOKEN
const COORD_PATTERN = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/
const KITCHEN_COORDS = [16.968230, 82.234376]

export default function CustomerPicker({ selectedCustomer, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', contact: '', address: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const [addressQuery, setAddressQuery] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [pin, setPin] = useState(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const debounceRef = useRef(null)
  
  // Mapbox Refs
  const mapContainer = useRef(null)
  const map = useRef(null)
  const marker = useRef(null)

  // Search Existing Customers
  useEffect(() => {
    if (!query.trim() || selectedCustomer) {
      setResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, contact, address, latitude, longitude')
        .or(`name.ilike.%${query}%,contact.ilike.%${query}%`)
        .limit(8)
      if (!error) setResults(data || [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, selectedCustomer])

  // Mapbox Map Rendering
  useEffect(() => {
    if (!pin || !showNewForm) {
      if (map.current) {
        map.current.remove()
        map.current = null
        marker.current = null
      }
      return
    }

    if (mapContainer.current) {
      if (!map.current) {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [pin.lng, pin.lat],
          zoom: 16
        })

        map.current.on('load', () => {
          setTimeout(() => { if (map.current) map.current.resize(); }, 150);
        });

        marker.current = new mapboxgl.Marker({ draggable: true, color: '#ef4444' })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map.current)

        marker.current.on('dragend', () => {
          const lngLat = marker.current.getLngLat()
          setPin({ lat: lngLat.lat, lng: lngLat.lng })
        })
      } else {
        map.current.flyTo({ center: [pin.lng, pin.lat] })
        if (marker.current) {
          marker.current.setLngLat([pin.lng, pin.lat])
        }
      }
    }
  }, [pin, showNewForm])

  // Mapbox Geocoding API (Address Search)
  async function fetchSuggestions(text) {
    if (!MAPBOX_TOKEN) return;
    setGeoLoading(true)
    try {
      // Prioritize results near the kitchen in India
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&country=in&proximity=${KITCHEN_COORDS[1]},${KITCHEN_COORDS[0]}&types=address,poi,neighborhood,locality&limit=5`;
      const res = await fetch(url)
      const data = await res.json()
      setAddressSuggestions(data.features || [])
    } catch (err) {
      console.error('Mapbox search failed:', err)
    }
    setGeoLoading(false)
  }

  function selectSuggestion(feature) {
    const label = feature.place_name
    // Mapbox returns coordinates as [longitude, latitude]
    const lng = feature.center[0]
    const lat = feature.center[1]
    
    setAddressQuery(label)
    setAddressSuggestions([])
    setPin({ lat, lng })
    setNewCustomer((prev) => ({ ...prev, address: label }))
  }

  function handleAddressChange(text) {
    setAddressQuery(text)
    setNewCustomer((prev) => ({ ...prev, address: text }))
    clearTimeout(debounceRef.current)

    const coordMatch = text.match(COORD_PATTERN)
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1])
      const lng = parseFloat(coordMatch[2])
      setPin({ lat, lng })
      setAddressSuggestions([])
      return
    }

    setPin(null)
    if (text.trim().length < 3) {
      setAddressSuggestions([])
      return
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 350)
  }

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
        latitude: pin?.lat ?? null,
        longitude: pin?.lng ?? null,
        // Removed Google place_id as it is no longer relevant
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
    setAddressQuery('')
    setPin(null)
  }

  if (selectedCustomer) {
    return (
      <div className="border rounded-md p-3 bg-green-50 border-green-200 flex justify-between items-center">
        <div>
          <p className="font-medium text-sm">{selectedCustomer.name}</p>
          <p className="text-xs text-gray-600">
            {selectedCustomer.contact} - {selectedCustomer.address}
          </p>
          {!selectedCustomer.latitude && (
            <p className="text-xs text-amber-600 mt-0.5">No pinned location on file - distance must be entered manually.</p>
          )}
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-xs text-red-600 hover:underline">
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

          <div className="relative">
            <input
              type="text"
              placeholder="Delivery address - start typing, or paste lat,lng"
              value={addressQuery}
              onChange={(e) => handleAddressChange(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
            {geoLoading && <p className="text-xs text-gray-400 mt-1">Looking up...</p>}
            {addressSuggestions.length > 0 && (
              <div className="border rounded-md mt-1 max-h-48 overflow-y-auto bg-white shadow-sm absolute z-10 w-full">
                {addressSuggestions.map((feature) => (
                  <button
                    type="button"
                    key={feature.id}
                    onClick={() => selectSuggestion(feature)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                  >
                    {feature.place_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {pin && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Drag the pin to fine-tune the exact spot:</p>
              <div className="w-full h-40 rounded-md overflow-hidden border">
                <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

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
              onClick={() => {
                setShowNewForm(false); setError(''); setAddressQuery(''); setPin(null);
              }}
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