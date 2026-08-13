import React, { useEffect, useState } from "react";
import LoginView from "./LoginView";
import DashboardView from "./DashboardView";

export default function CustomerPortalWrapper() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('lunchmate_customer');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check URL hash for OAuth tokens or session returns safely without protocol triggers
    const hash = window.location.hash || "";
    if (hash.includes("access_token") || hash.includes("session_id")) {
      setLoading(true);
      setTimeout(() => {
        const mockUser = {
          name: "Valued Customer",
          email: "customer@lunchmate.live",
          credits: 12,
          totalCredits: 20,
          balanceDue: 500
        };
        setUser(mockUser);
        localStorage.setItem('lunchmate_customer', JSON.stringify(mockUser));
        window.location.hash = "#/portal";
        setLoading(false);
      }, 500);
    }
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
      onLogout={() => {
        localStorage.removeItem('lunchmate_customer');
        setUser(null);
      }} 
    />
  );
}
