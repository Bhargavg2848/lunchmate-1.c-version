import CustomerPage from './CustomerPage.jsx';
import AdminPage from './AdminPage.jsx';
import DeliveryPage from './DeliveryPage.jsx';

export default function App() {
  const hostname = window.location.hostname;

  // 1. If the URL contains 'admin.', only load the Supabase Admin Page
  if (hostname.includes('admin.')) {
    return <AdminPage />;
  }

  // 2. If the URL contains 'delivery.', only load the Clerk Delivery Page
  if (hostname.includes('delivery.')) {
    return <DeliveryPage />;
  }

  // 3. Default fallback for 'customer.' or your root domain
  return <CustomerPage />;
}
