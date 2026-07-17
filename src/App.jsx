import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import MenuManager from './pages/MenuManager.jsx'
import NewOrder from './pages/NewOrder.jsx'
import Deliveries from './pages/Deliveries.jsx'
import Subscriptions from './pages/Subscriptions.jsx'
import SubscriptionDetails from './pages/SubscriptionDetails.jsx'
import KitchenDashboard from './pages/KitchenDashboard.jsx'
import DeliveryRoster from './pages/DeliveryRoster.jsx'

function navClass(isActive) {
  return `px-3 py-1.5 rounded-md text-sm font-medium ${
    isActive
      ? 'bg-green-600 text-white'
      : 'text-gray-600 hover:bg-gray-100'
  }`
}

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-bold text-lg text-green-700">Lunchmate OS</span>

            <div className="flex flex-wrap gap-2">
              <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
                New Order
              </NavLink>

              <NavLink
                to="/deliveries"
                className={({ isActive }) => navClass(isActive)}
              >
                Deliveries
              </NavLink>

              <NavLink
                to="/kitchen"
                className={({ isActive }) => navClass(isActive)}
              >
                Kitchen
              </NavLink>

              <NavLink
                to="/roster"
                className={({ isActive }) => navClass(isActive)}
              >
                Roster
              </NavLink>

              <NavLink
                to="/subscriptions"
                className={({ isActive }) => navClass(isActive)}
              >
                Subscriptions
              </NavLink>

              {/* NEW MENU MANAGER LINK */}
              <NavLink
                to="/menu"
                className={({ isActive }) => navClass(isActive)}
              >
                Menu & Pricing
              </NavLink>
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<NewOrder />} />
            <Route path="/deliveries" element={<Deliveries />} />
            <Route path="/kitchen" element={<KitchenDashboard />} />
            <Route path="/roster" element={<DeliveryRoster />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route
              path="/subscriptions/:orderId"
              element={<SubscriptionDetails />}
            />
            
            {/* NEW MENU MANAGER ROUTE */}
            <Route path="/menu" element={<MenuManager />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}