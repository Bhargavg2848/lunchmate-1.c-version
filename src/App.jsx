import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CustomerPage from './CustomerPage.jsx';
import AdminPage from './AdminPage.jsx';
import DeliveryPage from './DeliveryPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '10px', background: '#f4f4f4', display: 'flex', gap: '15px' }}>
        <Link to="/">Customer Portal</Link>
        <Link to="/delivery">Delivery Portal</Link>
        <Link to="/admin">Admin Portal</Link>
      </nav>
      <Routes>
        <Route path="/" element={<CustomerPage />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
