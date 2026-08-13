import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function DomainRouter() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const hostname = window.location.hostname
    // If they visit the root page using the delivery subdomain...
    if (hostname.startsWith('delivery.') && location.pathname === '/') {
      // Instantly push them into the Driver Mode interface
      navigate('/driver', { replace: true })
    }
  }, [navigate, location])

  return null
}
