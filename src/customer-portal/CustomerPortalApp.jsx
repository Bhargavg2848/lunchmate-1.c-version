import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import PortalDashboard from './pages/PortalDashboard.jsx'
import PortalProfile from './pages/PortalProfile.jsx'
import './portal.css'

export default function CustomerPortalApp() {
  return (
    <div className="lmp-root">
      <Routes>
        <Route path="/" element={<PortalDashboard />} />
        <Route path="/profile" element={<PortalProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" />
    </div>
  )
}
