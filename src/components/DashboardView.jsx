import React, { useState } from "react";
import { ChefHat, Calendar, Clock, Sparkles, MessageSquare, LogOut, CheckCircle2, AlertCircle } from "lucide-react";

export default function DashboardView({ user, onLogout }) {
  const [skippedDays, setSkippedDays] = useState(["2026-04-12"]);
  const [chefNote, setChefNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  const handleSkipToggle = (dateStr) => {
    if (skippedDays.includes(dateStr)) {
      setSkippedDays(skippedDays.filter(d => d !== dateStr));
    } else {
      setSkippedDays([...skippedDays, dateStr]);
    }
  };

  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!chefNote.trim()) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3000);
    setChefNote("");
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white p-4 sm:p-8 font-sans relative overflow-hidden">
      
      {/* Background Glowing Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/15 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-slate-900/60 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 shadow-2xl mb-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <ChefHat className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Welcome, {user?.name || "Valued Customer"}</h1>
              <p className="text-xs text-emerald-400/90 font-medium">Lunchmate Customer Portal • Farm-Fresh Daily</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Today's Meal & Skip Calendar */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Today's Meal Card */}
            <div className="bg-slate-900/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <ChefHat className="w-32 h-32 text-emerald-400" />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Today's Special Menu</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Authentic Homestyle Thali</h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">Basmati rice, fresh phulkas, dal tadka, seasonal paneer curry, and traditional dessert.</p>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs">
                <div className="bg-white/[0.03] p-3.5 rounded-2xl border border-white/5">
                  <div className="text-slate-400 mb-1">Meal Slot</div>
                  <div className="font-bold text-emerald-300">Lunch (12:30 PM - 1:45 PM)</div>
                </div>
                <div className="bg-white/[0.03] p-3.5 rounded-2xl border border-white/5">
                  <div className="text-slate-400 mb-1">Delivery Status</div>
                  <div className="font-bold text-amber-300">Preparing Fresh in Kitchen</div>
                </div>
              </div>
            </div>

            {/* Skip Meals Section */}
            <div className="bg-slate-900/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <h3 className="text-lg font-bold tracking-tight mb-2 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-400" />
                <span>Manage & Skip Meals</span>
              </h3>
              <p className="text-xs text-slate-400 mb-6">Traveling or eating out? Skip any upcoming day and save your meal credits automatically.</p>

              <div className="space-y-3">
                {["2026-04-12", "2026-04-13", "2026-04-14"].map((dateStr) => {
                  const isSkipped = skippedDays.includes(dateStr);
                  return (
                    <div key={dateStr} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <div>
                          <div className="text-sm font-semibold">{dateStr}</div>
                          <div className="text-[11px] text-slate-400">{isSkipped ? "Meal Skipped (Credit Saved)" : "Standard Delivery Scheduled"}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSkipToggle(dateStr)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSkipped 
                            ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" 
                            : "bg-white/10 hover:bg-white/20 text-white"
                        }`}
                      >
                        {isSkipped ? "Unskip Day" : "Skip This Day"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Col: Account & Whisper to Chef */}
          <div className="space-y-6">
            
            {/* Account Stats */}
            <div className="bg-slate-900/60 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <h3 className="text-sm font-bold tracking-wider uppercase text-slate-400 mb-4">Subscription Overview</h3>
              <div className="space-y-4">
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <div className="text-xs text-slate-400 mb-1">Available Credits</div>
                  <div className="text-3xl font-extrabold text-emerald-400">{user?.credits || 12} <span className="text-xs font-normal text-slate-400">/ {user?.totalCredits || 20} meals</span></div>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <div className="text-xs text-slate-400 mb-1">Balance Due</div>
                  <div className="text-2xl font-extrabold text-amber-300">₹{user?.balanceDue || 500}</div>
                </div>
              </div>
            </div>

            {/* Whisper to Chef */}
            <div className="bg-slate-900/60 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <h3 className="text-sm font-bold tracking-wider uppercase text-slate-400 mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <span>Whisper to Chef</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">Have special dietary preferences or delivery notes? Send a direct note to the kitchen.</p>
              
              <form onSubmit={handleSaveNote} className="space-y-3">
                <textarea
                  value={chefNote}
                  onChange={(e) => setChefNote(e.target.value)}
                  placeholder="e.g., Less spicy today please..."
                  rows="3"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                ></textarea>
                <button
                  type="submit"
                  className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Send Note to Kitchen
                </button>
                {noteSaved && (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium justify-center pt-1 animate-fade-in">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Note delivered successfully!</span>
                  </div>
                )}
              </form>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
