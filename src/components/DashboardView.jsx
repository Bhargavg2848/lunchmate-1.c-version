import React, { useState, useEffect } from "react";
import { ChefHat, CalendarDays, MessageSquare, LogOut } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

export default function DashboardView({ user, onLogout }) {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [schedule, setSchedule] = useState([
    { id: 1, date: "Tomorrow", meal: "North Indian Veg Pack" },
    { id: 2, date: "Thursday", meal: "South Indian Special" },
    { id: 3, date: "Friday", meal: "Lite Diet Bowl" }
  ]);

  const handleFeedback = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/feedback", { message: feedback });
      toast.success("Message whispered to the chef! 🌿");
      setFeedback("");
    } catch {
      toast.error("Failed to send message.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-emerald-50 font-sans pb-20">
      <div className="max-w-3xl mx-auto p-4 pt-6 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt="Avatar" className="h-12 w-12 rounded-2xl object-cover shadow-lg border border-white/20" />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-emerald-800 flex items-center justify-center"><ChefHat className="text-emerald-50" /></div>
            )}
            <div>
              <div className="text-[17px] font-bold">Hi, {user?.name?.split(" ")[0] || "Customer"} 👋</div>
              <div className="text-[11px] uppercase tracking-widest text-emerald-400">Lunchmate Portal</div>
            </div>
          </div>
          <button onClick={onLogout} className="p-3 bg-white/5 rounded-xl text-emerald-100 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"><LogOut size={18} /></button>
        </div>

        {/* Credits */}
        <div className="bg-emerald-950/60 p-6 rounded-3xl border border-emerald-500/20 shadow-lg">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Available Credits</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black">{user?.credits || 12}</span>
            <span className="text-xl text-emerald-200/50">/ {user?.totalCredits || 20} meals</span>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm">
            <span>Balance Due:</span>
            <span className="text-amber-400 font-bold">₹{user?.balanceDue || 500}</span>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-3">
          <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><CalendarDays size={14} /> Upcoming Deliveries</h3>
          {schedule.map((item) => (
            <div key={item.id} className="bg-emerald-950/40 p-4 rounded-2xl flex justify-between items-center border border-white/5">
              <div>
                <p className="font-bold">{item.date}</p>
                <p className="text-xs text-emerald-300/60">{item.meal}</p>
              </div>
              <button className="text-[11px] font-bold px-4 py-2 rounded-xl bg-emerald-800/50 hover:bg-emerald-700/50 transition-colors">Pause Day</button>
            </div>
          ))}
        </div>

        {/* Inbox */}
        <form onSubmit={handleFeedback} className="bg-emerald-950/60 p-6 rounded-3xl border border-emerald-500/20 shadow-lg">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><MessageSquare size={16} /> Whisper to Chef</h3>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none mb-3" placeholder="Less spice, extra salad..." rows={3} />
          <button disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-white">
            {submitting ? "Sending..." : "Send Message"}
          </button>
        </form>

      </div>
    </div>
  );
}
