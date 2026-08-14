import React from 'react';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import DomainRouter from './components/DomainRouter';
import DriverMode from './pages/DriverMode';
import { HashRouter, NavLink, Route, Routes, Navigate } from 'react-router-dom';
import MenuManager from './pages/MenuManager.jsx';
import NewOrder from './pages/NewOrder.jsx';
import Deliveries from './pages/Deliveries.jsx';
import Subscriptions from './pages/Subscriptions.jsx';
import SubscriptionDetails from './pages/SubscriptionDetails.jsx';
import KitchenDashboard from './pages/KitchenDashboard.jsx';
import AdminInbox from './components/AdminInbox.jsx';
import AdminOffers from './pages/AdminOffers.jsx';
import LandingPage from './pages/LandingPage.jsx';
import CustomerPortalApp from './customer-portal/CustomerPortalApp.jsx';
import DeliveryRoster from './pages/DeliveryRoster.jsx';
import CustomerTracker from './CustomerTracker.jsx';
import Auth from './components/Auth.jsx';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function navClass(isActive) {
  return `px-3 py-1.5 rounded-md text-sm font-medium ${
    isActive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`
}

function AdminLayout({ children }) {
  return (
    <Auth>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-bold text-lg text-green-700">Lunchmate OS</span>
            <div className="flex flex-wrap gap-2">
              <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>New Order</NavLink>
              <NavLink to="/deliveries" className={({ isActive }) => navClass(isActive)}>Deliveries</NavLink>
              <NavLink to="/kitchen" className={({ isActive }) => navClass(isActive)}>Kitchen</NavLink>
              <NavLink to="/inbox" className={({ isActive }) => navClass(isActive)}>Inbox</NavLink>
              <NavLink to="/offers" className={({ isActive }) => navClass(isActive)}>Offers</NavLink>
              <NavLink to="/roster" className={({ isActive }) => navClass(isActive)}>Roster</NavLink>
              <NavLink to="/subscriptions" className={({ isActive }) => navClass(isActive)}>Subscriptions</NavLink>
              <NavLink to="/menu" className={({ isActive }) => navClass(isActive)}>Menu & Pricing</NavLink>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <DomainRouter />
          {children}
        </main>
      </div>
    </Auth>
  )
}

export default function App() {
  const hostname = window.location.hostname;

  // 0. ROOT DOMAIN — public landing page (no auth)
  if (hostname === 'lunchmate.live' || hostname === 'www.lunchmate.live') {
    return <LandingPage />;
  }

  // 1. DELIVERY SUBDOMAIN
  if (hostname.includes('delivery.')) {
    return (
      <ClerkProvider publishableKey={clerkPubKey} afterSignOutUrl="https://delivery.lunchmate.live">
        <HashRouter>
          <Routes>
            <Route path="*" element={
              <>
                <SignedIn>
                  <DriverMode />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn redirectUrl="https://delivery.lunchmate.live" />
                </SignedOut>
              </>
            } />
          </Routes>
        </HashRouter>
      </ClerkProvider>
    );
  }

  // 2. CUSTOMER SUBDOMAIN
  if (hostname.includes('customer.')) {
    return (
      <ClerkProvider publishableKey={clerkPubKey} afterSignOutUrl="https://customer.lunchmate.live">
        <HashRouter>
          <Routes>
            <Route path="*" element={
              <>
                <SignedIn>
                  <CustomerPortalApp />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn redirectUrl="https://customer.lunchmate.live" />
                </SignedOut>
              </>
            } />
          </Routes>
        </HashRouter>
      </ClerkProvider>
    );
  }

  // 3. ADMIN SUBDOMAIN (or fallback)
  return (
    <HashRouter>
      <Routes>
        <Route path="/*" element={
          <AdminLayout>
            <Routes>
              <Route path="/" element={<NewOrder />} />
              <Route path="/deliveries" element={<Deliveries />} />
              <Route path="/kitchen" element={<KitchenDashboard />} />
              <Route path="/inbox" element={<AdminInbox />} />
              <Route path="/offers" element={<AdminOffers />} />
              <Route path="/roster" element={<DeliveryRoster />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/subscriptions/:orderId" element={<SubscriptionDetails />} />
              <Route path="/tracker" element={<CustomerTracker />} />
              <Route path="/menu" element={<MenuManager />} />
              <Route path="/driver" element={<DriverMode />} />
            </Routes>
          </AdminLayout>
        } />
      </Routes>
    </HashRouter>
  )
}

console.log('Cache Bust 1.0');
