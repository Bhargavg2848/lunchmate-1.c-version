import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Helper to convert VAPID key if needed, or use standard browser push
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if ('Notification' in window && navigator.serviceWorker) {
      if (Notification.permission === 'granted') {
        setSubscribed(true)
      }
    }
  }, [])

  async function subscribeUser() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('Push notifications are not supported by your browser.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Permission for notifications was denied.')
      }

      const registration = await navigator.serviceWorker.ready
      
      // Register subscription (using standard application server key placeholder or standard browser push)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Njh8W0')
      })

      // Save subscription endpoint to Supabase
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert({
          endpoint: subscription.endpoint,
          subscription_data: subscription.toJSON()
        }, { onConflict: 'endpoint' })

      if (dbError) throw dbError

      setSubscribed(true)
      alert('Push notifications enabled successfully!')
    } catch (err) {
      console.error('Push subscription failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-3 bg-white border rounded-md shadow-sm flex items-center justify-between mb-4">
      <div>
        <p className="text-sm font-bold text-gray-800">Browser Push Alerts</p>
        <p className="text-xs text-gray-500">
          {subscribed ? 'Active - Ready to receive kitchen alerts' : 'Enable to get notified of new orders'}
        </p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      {!subscribed && (
        <button
          type="button"
          disabled={loading}
          onClick={subscribeUser}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50 transition-colors"
        >
          {loading ? 'Enabling...' : 'Enable Push'}
        </button>
      )}
      {subscribed && (
        <span className="text-xs bg-green-100 text-green-800 font-bold px-2 py-1 rounded">
          Enabled ✓
        </span>
      )}
    </div>
  )
}
