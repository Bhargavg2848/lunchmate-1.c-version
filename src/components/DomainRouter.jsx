import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function DomainRouter() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const hostname = window.location.hostname
    
    // Route for Delivery Executives
    if (hostname.startsWith('delivery.') && location.pathname === '/') {
      navigate('/driver', { replace: true })
    }
    
    // Route for Customers
    if (hostname.startsWith('customer.') && location.pathname === '/') {
      navigate('/portal', { replace: true })
    }
  }, [navigate, location])

  return null
}
