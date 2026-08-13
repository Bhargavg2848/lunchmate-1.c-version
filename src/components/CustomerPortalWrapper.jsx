import React, { useEffect, useState } from "react";
import LoginView from "./LoginView";
import DashboardView from "./DashboardView";
import { supabase } from "../lib/supabase";

export default function CustomerPortalWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          name: session.user.user_metadata?.full_name || session.user.email.split("@")[0],
          email: session.user.email,
          credits: 12,
          totalCredits: 20,
          balanceDue: 500
        });
      }
      setLoading(false);
    });

    // Listen for auth state changes (Google OAuth callback return)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          name: session.user.user_metadata?.full_name || session.user.email.split("@")[0],
          email: session.user.email,
          credits: 12,
          totalCredits: 20,
          balanceDue: 500
        });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <DashboardView 
      user={user} 
      onLogout={async () => {
        await supabase.auth.signOut();
        setUser(null);
      }} 
    />
  );
}
