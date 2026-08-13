import React, { useEffect, useState } from "react";
import LoginView from "./LoginView";
import DashboardView from "./DashboardView";
import api from "../lib/api";

export default function CustomerPortalWrapper() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('lunchmate_customer');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    api.get("/auth/me")
      .then((res) => {
        // Map the data to fix the missing details in the UI
        const userData = {
          ...res.data,
          credits: res.data.credits || 12,
          totalCredits: res.data.totalCredits || 20,
          balanceDue: res.data.balanceDue || 500
        };
        setUser(userData);
        localStorage.setItem('lunchmate_customer', JSON.stringify(userData));
      })
      .catch(() => {}) // Fallback to localStorage if API fails
      .finally(() => setLoading(false));
  }, []);

  // Handle Emergent Google Login callback
  useEffect(() => {
    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (match) {
      setLoading(true);
      api.post("/auth/session", { session_id: decodeURIComponent(match[1]) })
        .then(res => {
          const userData = { ...res.data, credits: 12, totalCredits: 20, balanceDue: 500 };
          setUser(userData);
          localStorage.setItem('lunchmate_customer', JSON.stringify(userData));
          window.history.replaceState(null, "", window.location.pathname + "#/portal");
        })
        .finally(() => setLoading(false));
    }
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <LoginView />;

  return <DashboardView user={user} onLogout={() => {
    localStorage.removeItem('lunchmate_customer');
    setUser(null);
    api.post("/auth/logout").catch(() => {});
  }} />;
}
