import React, { useState } from "react";
import { ChefHat, Calendar, Clock, Sparkles, MessageSquare, LogOut, CheckCircle2, Flame, ArrowUpRight } from "lucide-react";

export default function DashboardView({ user, onLogout }) {
  const [skippedDays, setSkippedDays] = useState(["2026-10-27"]);
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

  const schedule = [
    { date: "TODAY, OCT 24", title: "Avocado & Grilled Chicken Protein Bowl", status: "Preparing", live: true, icon: "🥑" },
    { date: "TOMORROW, OCT 25", title: "Paneer Tikka & Quinoa Power Salad", status: "Scheduled", live: false, icon: "🧀" },
    { date: "SAT, OCT 26", title: "Mediterranean Herb Salmon Bowl", status: "Scheduled", live: false, icon: "🐟" },
    { date: "SUN, OCT 27", title: "Roasted Veggie & Chickpea Harvest Bowl", status: "Scheduled", live: false, icon: "🥕" },
    { date: "MON, OCT 28", title: "Asian Sesame Tofu & Brown Rice Bowl", status: "Scheduled", live: false, icon: "🍲" }
  ];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white p-4 sm:p-8 font-sans relative overflow-hidden selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Background Floating Vegetable & Food Outlines */}
      <div className="absolute top-12 left-16 text-emerald-500/10 pointer-events-none transform -rotate-12 select-none text-4xl">🍃</div>
      <div className="absolute top-36 right-24 text-amber-500/10 pointer-events-none transform rotate-12 select-none text-3xl">🍴</div>
      <div className="absolute top-96 left-8 text-emerald-400/10 pointer-events-none select-none text-3xl">🥗</div>
      <div className="absolute bottom-48 left-16 text-amber-500/10 pointer-events-none transform rotate-45 select-none text-4xl">🥕</div>
      <div className="absolute bottom-32 right-20 text-emerald-500/10 pointer-events-none transform -rotate-12 select-none text-3xl">🌿</div>
      <div className="absolute top-1/2 right-12 text-teal-400/10 pointer-events-none select-none text-3xl">🍒</div>

      {/* Ambient Glowing Orbs */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/3 -right-40 w-[450px] h-[450px] bg-teal-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10 pb-16">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between bg-slate-900/40 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/10 shadow-2xl mb-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 shadow-md shadow-emerald-500/20">
              {user?.name ? user.name[0].toUpperCase() : "B"}
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
                <span>Hi, {user?.name || "Bhargav"}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold tracking-wider">👑 OWNER</span>
              </div>
              <div className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">Lunchmate • Portal</div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Hero Greeting */}
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-2">Your Daily Kitchen</div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
            Good afternoon,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-white">
              {user?.name || "Bhargav"}.
            </span>
          </h1>
          <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
            Today's bowl is on the flame. Manage credits, pause a day, or whisper a note to the chef — all in a tap.
          </p>
        </div>

        {/* Credits & Billing Card */}
        <div className="bg-slate-900/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden mb-8">
          <div className="absolute top-6 right-6 text-xs font-semibold tracking-widest text-slate-400 uppercase">Cycle · Oct</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Credits Remaining</span>
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
                <span>{user?.credits || 12}</span>
                <span className="text-lg font-medium text-slate-500">/ {user?.totalCredits || 20}</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-4">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" style={{ width: '60%' }}></div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 font-medium">12 meals left this cycle</div>
            </div>

            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>Balance Due</span>
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold text-amber-300 tracking-tight">
                ₹{user?.balanceDue || 500}
              </div>
              <div className="text-[11px] text-slate-400 mt-4 font-medium">Auto-charge on 30 Oct · UPI</div>
            </div>
          </div>

          <button className="w-full h-14 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.99] transition-all cursor-pointer">
            <span>Top up credits</span>
            <ArrowUpRight className="h-5 w-5" />
          </button>
        </div>

        {/* Upcoming Schedule Section */}
        <div className="bg-slate-900/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span>Upcoming Schedule</span>
            </h3>
          </div>

          <div className="space-y-4">
            {schedule.map((item, idx) => {
              const isSkipped = skippedDays.includes(item.date);
              return (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl p-2.5 rounded-xl bg-white/5 border border-white/10">{item.icon}</div>
                    <div>
                      <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <span>{item.date}</span>
                        {item.live && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] animate-pulse">LIVE</span>}
                      </div>
                      <div className="text-sm font-bold text-white">{item.title}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {item.live ? (
                      <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5" />
                        <span>Preparing</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSkipToggle(item.date)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                          isSkipped 
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300" 
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                        }`}
                      >
                        {isSkipped ? "Paused / Skipped" : "Pause / Skip Day"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kitchen Inbox */}
        <div className="bg-slate-900/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <span>Kitchen Inbox</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">Read within 4h</span>
          </div>
          
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Allergies, spice preferences, or a special request — whisper it to Chef Meera below.
          </p>

          <form onSubmit={handleSaveNote} className="space-y-4">
            <textarea
              value={chefNote}
              onChange={(e) => setChefNote(e.target.value)}
              placeholder="e.g., Please go easy on chili this week, and skip peanuts entirely 🥜"
              rows="4"
              maxLength="400"
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none shadow-inner"
            ></textarea>
            
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">{chefNote.length}/400</span>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Send to Kitchen</span>
              </button>
            </div>

            {noteSaved && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium justify-center pt-2 animate-fade-in">
                <CheckCircle2 className="h-4 w-4" />
                <span>Whispered successfully to Chef Meera!</span>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-slate-500 text-xs flex items-center justify-center gap-2 font-medium">
          <ChefHat className="h-4 w-4 text-emerald-500/60" />
          <span>Cooked with care by Lunchmate · Bengaluru</span>
        </div>

      </div>
    </div>
  );
}
