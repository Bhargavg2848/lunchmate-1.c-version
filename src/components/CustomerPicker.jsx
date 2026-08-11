import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Initialize Mapbox
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
mapboxgl.accessToken = MAPBOX_TOKEN
const COORD_PATTERN = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/
const KITCHEN_COORDS = [16.968230, 82.234376]

export default function CustomerPicker({ selectedCustomer, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
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

  // Search Existing Customers in Supabase
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

  // Mapbox Visual Map Rendering & Draggable Marker
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

  // --- HYBRID GEOCODING: Photon (Free OSM API) + Mapbox Geocoding ---
  async function fetchSuggestions(text) {
    setGeoLoading(true)
    const combinedSuggestions = []

    // 1. Fetch from Photon (Free OpenStreetMap search by Komoot)
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&lat=${KITCHEN_COORDS[0]}&lon=${KITCHEN_COORDS[1]}&limit=4`
      const photonRes = await fetch(photonUrl)
      const photonData = await photonRes.json()
      if (photonData?.features) {
        photonData.features.forEach((f, i) => {
          const props = f.properties || {}
          const labelParts = [props.name, props.street, props.district, props.city, props.state].filter(Boolean)
          combinedSuggestions.push({
            id: `photon-${i}-${f.geometry.coordinates.join(',')}`,
            place_name: labelParts.join(', ') || props.name || 'Location Result',
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            source: 'Photon (OSM)'
          })
        })
      }
    } catch (err) {
      console.error('Photon search failed:', err)
    }

    // 2. Fetch from Mapbox Geocoding API (Kept intact)
    if (MAPBOX_TOKEN) {
      try {
        const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&country=in&proximity=${KITCHEN_COORDS[1]},${KITCHEN_COORDS[0]}&types=address,poi,neighborhood,locality&limit=4`;
        const mapboxRes = await fetch(mapboxUrl)
        const mapboxData = await mapboxRes.json()
        if (mapboxData?.features) {
          mapboxData.features.forEach((f) => {
            combinedSuggestions.push({
              id: f.id,
              place_name: f.place_name,
              lng: f.center[0],
              lat: f.center[1],
              source: 'Mapbox'
            })
          })
        }
      } catch (err) {
        console.error('Mapbox search failed:', err)
      }
    }

    setAddressSuggestions(combinedSuggestions)
    setGeoLoading(false)
  }

  function selectSuggestion(item) {
    setAddressQuery(item.place_name)
    setAddressSuggestions([])
    setPin({ lat: item.lat, lng: item.lng })
    setNewCustomer((prev) => ({ ...prev, address: item.place_name }))
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
    const payload = {
      name: newCustomer.name.trim(),
      contact: newCustomer.contact.trim(),
      address: newCustomer.address.trim(),
      latitude: pin?.lat ?? null,
      longitude: pin?.lng ?? null,
    }

    const request = isEditMode
      ? supabase
          .from('customers')
          .update(payload)
          .eq('id', selectedCustomer.id)
          .select()
          .single()
      : supabase
          .from('customers')
          .insert(payload)
          .select()
          .single()

    const { data, error } = await request
    setCreating(false)

    if (error) {
      setError(error.message)
      return
    }
    onSelect(data)
    setShowNewForm(false)
    setIsEditMode(false)
    setNewCustomer({ name: '', contact: '', address: '' })
    setAddressQuery('')
    setPin(null)
  }

  if (selectedCustomer && !showNewForm) {
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
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => {
              setIsEditMode(true)
              setShowNewForm(true)
              setNewCustomer({
                name: selectedCustomer.name || '',
                contact: selectedCustomer.contact || '',
                address: selectedCustomer.address || '',
              })
              setAddressQuery(selectedCustomer.address || '')
              if (selectedCustomer.latitude && selectedCustomer.longitude) {
                setPin({
                  lat: Number(selectedCustomer.latitude),
                  lng: Number(selectedCustomer.longitude),
                })
              } else {
                setPin(null)
              }
            }}
            className="text-xs text-blue-700 hover:underline"
          >
            Edit Details
          </button>
          <button type="button" onClick={() => onSelect(null)} className="text-xs text-red-600 hover:underline">
            Change
          </button>
        </div>
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
            onClick={() => {
              setIsEditMode(false)
              setShowNewForm(true)
            }}
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
            {geoLoading && <p className="text-xs text-gray-400 mt-1">Searching Photon & Mapbox...</p>}
            {addressSuggestions.length > 0 && (
              <div className="border rounded-md mt-1 max-h-48 overflow-y-auto bg-white shadow-md absolute z-10 w-full divide-y">
                {addressSuggestions.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => selectSuggestion(item)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex justify-between items-center"
                  >
                    <span className="truncate pr-2">{item.place_name}</span>
                    <span className="text-[10px] text-gray-400 border px-1 rounded shrink-0 bg-gray-50">
                      {item.source}
                    </span>
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
              {creating ? 'Saving...' : isEditMode ? 'Update Customer' : 'Save Customer'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewForm(false); setError(''); setAddressQuery(''); setPin(null); setIsEditMode(false);
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
