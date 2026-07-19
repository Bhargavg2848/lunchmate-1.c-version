import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
const COORD_PATTERN = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/
const KITCHEN_COORDS = [16.9702, 82.2332]

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
  const [placeId, setPlaceId] = useState(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const sessionTokenRef = useRef(null)
  const debounceRef = useRef(null)

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

  function newSessionToken() {
    sessionTokenRef.current = crypto.randomUUID()
    return sessionTokenRef.current
  }

  async function fetchSuggestions(text) {
    if (!GOOGLE_API_KEY) {
      console.warn('VITE_GOOGLE_PLACES_API_KEY is not set - address search disabled.')
      return
    }
    if (!sessionTokenRef.current) newSessionToken()
    setGeoLoading(true)
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
        },
        body: JSON.stringify({
          input: text,
          sessionToken: sessionTokenRef.current,
          regionCode: 'IN',
          locationBias: {
            circle: {
              center: { latitude: KITCHEN_COORDS[0], longitude: KITCHEN_COORDS[1] },
              radius: 20000.0,
            },
          },
        }),
      })
      const data = await res.json()
      setAddressSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('Places autocomplete failed:', err)
    }
    setGeoLoading(false)
  }

  async function selectSuggestion(suggestion) {
    const id = suggestion.placePrediction.placeId
    const label = suggestion.placePrediction.text.text
    setAddressQuery(label)
    setAddressSuggestions([])
    setGeoLoading(true)
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${id}?sessionToken=${sessionTokenRef.current}`,
        {
          headers: {
            'X-Goog-Api-Key': GOOGLE_API_KEY,
            'X-Goog-FieldMask': 'location,formattedAddress',
          },
        }
      )
      const data = await res.json()
      if (data.location) {
        setPin({ lat: data.location.latitude, lng: data.location.longitude })
        setPlaceId(id)
        setNewCustomer((prev) => ({ ...prev, address: data.formattedAddress || label }))
      }
    } catch (err) {
      console.error('Place details failed:', err)
    }
    sessionTokenRef.current = null
    setGeoLoading(false)
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
      setPlaceId(null)
      setAddressSuggestions([])
      return
    }

    setPin(null)
    setPlaceId(null)
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
        place_id: placeId,
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
    setPlaceId(null)
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
                {addressSuggestions.map((s) => (
                  <button
                    type="button"
                    key={s.placePrediction.placeId}
                    onClick={() => selectSuggestion(s)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                  >
                    {s.placePrediction.text.text}
                  </button>
                ))}
              </div>
            )}
          </div>

          {pin && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Drag the pin to fine-tune the exact spot:</p>
              <div className="w-full h-40 rounded-md overflow-hidden border">
                <MapContainer center={[pin.lat, pin.lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker
                    position={[pin.lat, pin.lng]}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const { lat, lng } = e.target.getLatLng()
                        setPin({ lat, lng })
                      },
                    }}
                  />
                </MapContainer>
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
                setShowNewForm(false); setError(''); setAddressQuery(''); setPin(null); setPlaceId(null)
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
