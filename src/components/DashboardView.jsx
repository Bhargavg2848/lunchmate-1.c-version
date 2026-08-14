import React from "react";
import { useUser } from "@clerk/clerk-react";

export default function DashboardView({ user: dbUser, onLogout }) {
  const { user: clerkUser } = useUser();

  // Pull real Google Data
  const firstName = clerkUser?.firstName || dbUser?.name?.split(" ")[0] || "Guest";
  const userImage = clerkUser?.imageUrl || "https://ui-avatars.com/api/?name=" + firstName;
  const userEmail = clerkUser?.primaryEmailAddress?.emailAddress || dbUser?.email;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans pb-12 selection:bg-emerald-500/30">
      
      <div className="max-w-3xl mx-auto px-4 pt-6">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center bg-[#111827] border border-slate-800/60 p-3 rounded-full shadow-lg mb-10">
          <div className="flex items-center gap-3 pl-2">
            <img src={userImage} alt="Profile" className="w-10 h-10 rounded-full border border-emerald-500/30 object-cover shadow-sm" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-200">Hi, {firstName}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold tracking-wider">?? PRO</span>
              </div>
              <span className="text-xs text-slate-400 font-medium tracking-wide">{userEmail}</span>
            </div>
          </div>
          <button onClick={onLogout} className="px-5 py-2 mr-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-full transition-all duration-300 active:scale-95 border border-slate-700/50 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Logout
          </button>
        </div>

        {/* HERO SECTION */}
        <div className="mb-10 pl-2">
          <h2 className="text-emerald-500 font-bold tracking-widest text-xs uppercase mb-3">Your Daily Kitchen</h2>
          <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Good afternoon,<br />
            <span className="text-emerald-400">{firstName}.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-lg">
            Today's bowl is on the flame. Manage credits, pause a day, or whisper a note to the chef — all in a tap.
          </p>
        </div>

        {/* CREDITS CARD */}
        <div className="bg-[#111827] border border-slate-800/80 p-6 sm:p-8 rounded-[2rem] shadow-2xl mb-8 relative overflow-hidden">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2 flex items-center gap-2">
                <span className="text-emerald-400">?</span> Credits Remaining
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">{dbUser?.credits || 12}</span>
                <span className="text-xl font-bold text-slate-500">/ {dbUser?.totalCredits || 20}</span>
              </div>
            </div>
            <div className="text-right">
               <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2 flex items-center justify-end gap-2">
                <span className="text-amber-400">??</span> Balance Due
              </h3>
              <span className="text-4xl font-black text-amber-400">?{dbUser?.balanceDue || 500}</span>
              <p className="text-xs text-slate-500 mt-1">Auto-charge on 30 Oct &middot; UPI</p>
            </div>
          </div>

          {/* Gradient Progress Bar */}
          <div className="w-full bg-slate-800 h-2.5 rounded-full mb-3 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" style={{ width: '60%' }}></div>
          </div>
          <p className="text-xs text-slate-500 mb-8 font-medium">12 meals left this cycle</p>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-4 rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              Top up credits &nearr;
            </button>
            <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all duration-300 active:scale-[0.98] border border-slate-700 flex justify-center items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download Invoice
            </button>
          </div>
        </div>

        {/* UPCOMING SCHEDULE */}
        <div className="bg-[#111827] border border-slate-800/80 p-6 sm:p-8 rounded-[2rem] shadow-xl mb-8">
           <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
             Upcoming Schedule
           </h3>

           <div className="space-y-4">
             {/* Meal 1 */}
             <div className="flex items-center justify-between p-4 bg-[#0B1120] rounded-2xl border border-slate-800/60 transition-all duration-300 hover:border-emerald-500/30">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-800/50 rounded-xl flex items-center justify-center text-2xl shadow-inner">??</div>
                 <div>
                   <p className="text-xs font-bold text-emerald-500 mb-0.5">TODAY, OCT 24 <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] ml-1">LIVE</span></p>
                   <p className="text-sm font-bold text-white">Avocado & Grilled Chicken Protein Bowl</p>
                 </div>
               </div>
               <button className="px-4 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-2">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                 Preparing
               </button>
             </div>

             {/* Meal 2 */}
             <div className="flex items-center justify-between p-4 bg-[#0B1120] rounded-2xl border border-slate-800/60 opacity-70">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-800/50 rounded-xl flex items-center justify-center text-2xl shadow-inner">??</div>
                 <div>
                   <p className="text-xs font-bold text-emerald-500 mb-0.5">SAT, OCT 26</p>
                   <p className="text-sm font-bold text-white">Mediterranean Herb Salmon Bowl</p>
                 </div>
               </div>
               <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors">
                 Pause / Skip Day
               </button>
             </div>
           </div>
        </div>

        {/* KITCHEN INBOX */}
        <div className="bg-[#111827] border border-slate-800/80 p-6 sm:p-8 rounded-[2rem] shadow-xl mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              Kitchen Inbox
            </h3>
            <span className="text-[10px] text-slate-500 font-medium bg-slate-800/50 px-2 py-1 rounded-full">Read within 4h</span>
          </div>
          <p className="text-sm text-slate-400 mb-4">Allergies, spice preferences, or a special request &mdash; whisper it to Chef Meera below.</p>
          <textarea
            className="w-full bg-[#0B1120] border border-slate-800 rounded-2xl p-4 text-slate-300 focus:ring-1 focus:ring-emerald-500/50 outline-none resize-none transition-all duration-300 placeholder-slate-600 text-sm"
            rows="3"
            placeholder="e.g., Please go easy on chili this week, and skip peanuts entirely ??"
          ></textarea>
          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-slate-600 font-medium">0/400</span>
            <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all duration-300 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              Send to Kitchen
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center mt-12 pb-8">
          <p className="text-slate-500 text-xs font-medium tracking-wide flex items-center justify-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"></path><line x1="6" y1="17" x2="18" y2="17"></line></svg>
            Cooked with care by Lunchmate &middot; <span className="text-emerald-500">Kakinada</span>
          </p>
        </div>

      </div>
    </div>
  );
}
