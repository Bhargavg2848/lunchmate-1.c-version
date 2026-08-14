import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const supabaseAdminClient = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
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
      <div style={{ padding: '20px' }}>
        <h2>Admin Login (Supabase)</h2>
        <p>Protected area. Please authenticate via Supabase.</p>
      </div>
    ); 
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Admin Dashboard</h2>
      <p>Kitchen queue, user management, and system stats.</p>
    </div>
  );
}
