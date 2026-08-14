import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CustomerPage from './CustomerPage.jsx';
import AdminPage from './AdminPage.jsx';
import DeliveryPage from './DeliveryPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '15px', background: '#333', color: '#fff', display: 'flex', gap: '20px' }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Customer Portal</Link>
        <Link to="/delivery" style={{ color: '#fff', textDecoration: 'none' }}>Delivery Portal</Link>
        <Link to="/admin" style={{ color: '#fff', textDecoration: 'none' }}>Admin Portal</Link>
      </nav>
      <Routes>
        <Route path="/" element={<CustomerPage />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
