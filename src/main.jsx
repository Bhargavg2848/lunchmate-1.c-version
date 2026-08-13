import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import Auth from './components/Auth.jsx'
import CustomerPortalWrapper from './components/CustomerPortalWrapper.jsx'

function RootWrapper() {
  const [hash, setHash] = useState(window.location.hash);
  
  // Listen for URL changes
  useEffect(() => {
    const handleHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // 🚪 THE SWITCH: If URL is /#/portal, bypass the Admin Auth and Navbar entirely
  if (hash.startsWith('#/portal')) {
    return <CustomerPortalWrapper />;
  }

  // 🔒 Otherwise, load the secure Admin OS with the Supabase Bouncer
  return (
    <Auth>
      <App />
    </Auth>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootWrapper />
  </React.StrictMode>
)
