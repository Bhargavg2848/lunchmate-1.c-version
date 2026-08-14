import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

// Initialize Supabase only for this admin component
const supabaseAdminClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function AdminPage() {
  const [adminSession, setAdminSession] = useState(null);

  useEffect(() => {
    supabaseAdminClient.auth.getSession().then(({ data: { session } }) => {
      setAdminSession(session);
    });
  }, []);

  if (!adminSession) {
    return (
      <div className="admin-login">
        <h2>Admin Login</h2>
        <p>Supabase UI or login logic goes here.</p>
      </div>
    ); 
  }

  return <div>Welcome to the Admin Dashboard</div>;
}
