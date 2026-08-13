import React, { useEffect, useState } from "react";
import LoginView from "./LoginView";
import DashboardView from "./DashboardView";
import { supabase } from "../lib/supabase";

export default function CustomerPortalWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const hash = window.location.hash || "";
      
      // Handle OAuth token trapped by HashRouter
      if (hash.includes("access_token")) {
        try {
          const cleanHash = hash.replace("#/portal#", "&").replace("#", "&");
          const params = new URLSearchParams(cleanHash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });
            if (error) throw error;
            if (data?.session?.user) {
              const u = data.session.user;
              setUser({
                name: u.user_metadata?.full_name || u.email.split("@")[0],
                email: u.email,
                credits: 12,
                totalCredits: 20,
                balanceDue: 500
              });
              window.location.hash = "#/portal";
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("Auth session error:", err);
        }
      }

      // Check standard active session
      const { data: { session } } = await supabase.auth.getSession();
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
    };

    handleAuthCallback();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          name: session.user.user_metadata?.full_name || session.user.email.split("@")[0],
          email: session.user.email,
          credits: 12,
          totalCredits: 20,
          balanceDue: 500
        });
        setLoading(false);
      }
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
