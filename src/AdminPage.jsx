import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

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

    const {
      data: { subscription },
    } = supabaseAdminClient.auth.onAuthStateChange((_event, session) => {
      setAdminSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!adminSession) {
    return (
      <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px' }}>
        <h2>Admin Secure Login</h2>
        <Auth 
          supabaseClient={supabaseAdminClient} 
          appearance={{ theme: ThemeSupa }} 
          providers={[]} 
        />
      </div>
    ); 
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Admin Dashboard</h2>
      <p>Kitchen queue, user management, and system stats.</p>
      <button 
        onClick={() => supabaseAdminClient.auth.signOut()}
        style={{ marginTop: '20px', padding: '10px', cursor: 'pointer' }}
      >
        Sign Out Admin
      </button>
    </div>
  );
}
