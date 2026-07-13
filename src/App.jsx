import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import NewOrder from './pages/NewOrder.jsx'
import Deliveries from './pages/Deliveries.jsx'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="font-bold text-lg text-green-700">Lunchmate OS</span>
            <div className="flex gap-2">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium ${isActive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`
                }
              >
                New Order
              </NavLink>
              <NavLink
                to="/deliveries"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium ${isActive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`
                }
              >
                Today's Deliveries
              </NavLink>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<NewOrder />} />
            <Route path="/deliveries" element={<Deliveries />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
