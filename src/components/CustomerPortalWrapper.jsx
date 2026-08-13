import React, { useEffect, useState } from "react";
import api from "../lib/api";
import LoginView from "./LoginView";
import DashboardView from "./DashboardView";

export default function CustomerPortalWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Automatically check FastAPI for an existing session on refresh
  useEffect(() => {
    api.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-emerald-500 flex flex-col items-center justify-center font-bold">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        Warming up the kitchen...
      </div>
    );
  }

  if (!user) return <LoginView />;

  return <DashboardView user={user} onLogout={() => {
    api.post("/auth/logout").then(() => setUser(null)).catch(() => setUser(null));
  }} />;
}
