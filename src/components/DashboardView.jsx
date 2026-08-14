import React from "react";
import { useUser } from "@clerk/clerk-react";
import { Leaf } from "lucide-react"; 

export default function DashboardView({ user: dbUser, onLogout }) {
  // We pull Clerk here just to grab their live Google Profile Picture
  const { user: clerkUser } = useUser();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 relative overflow-hidden font-sans">
      
      {/* Floating Background Leaves */}
      <div className="absolute top-20 left-10 text-emerald-900/30 animate-float-slow z-0">
        <Leaf size={64} />
      </div>
      <div className="absolute bottom-40 right-10 text-emerald-900/20 animate-float-delayed z-0">
        <Leaf size={48} />
      </div>

      <div className="max-w-3xl mx-auto relative z-10 pt-8">
        
        {/* HEADER: Real Google Data & Apple-style Logout */}
        <div className="flex justify-between items-center bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-4 rounded-3xl shadow-xl mb-8">
          <div className="flex items-center gap-4">
            {/* Google Profile Image */}
            <img 
              src={clerkUser?.imageUrl || "https://ui-avatars.com/api/?name=User"} 
              alt="Google Profile Picture" 
              className="w-14 h-14 rounded-full border-2 border-emerald-500/40 shadow-lg object-cover"
            />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Hi, {clerkUser?.firstName || dbUser?.name || "Guest"}
              </h1>
              {/* Actual Gmail Address */}
              <p className="text-sm text-slate-400">{clerkUser?.primaryEmailAddress?.emailAddress || dbUser?.email}</p>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-full apple-transition active:scale-95 border border-slate-700"
          >
            Logout
          </button>
        </div>

        {/* SUBSCRIPTION DATA */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-xl mb-6">
          <h2 className="text-emerald-400 font-semibold tracking-wider text-sm uppercase mb-2">Active Plan</h2>
          <h3 className="text-3xl font-bold text-white mb-6">South Indian Pack - Vegetarian</h3>
          
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400 text-sm mb-1">Credits Remaining</p>
              <p className="text-2xl font-bold text-white">
                <span className="text-emerald-500">{dbUser?.credits || 3}</span> / {dbUser?.totalCredits || 3}
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400 text-sm mb-1">Pending Meals</p>
              <p className="text-2xl font-bold text-white text-amber-500">{dbUser?.credits || 3}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl shadow-[0_0_20px_rgba(5,150,105,0.3)] apple-transition active:scale-[0.97]">
              View Menu Schedule
            </button>
            <button className="px-6 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 rounded-xl border border-slate-700 apple-transition active:scale-[0.97]">
              Download Invoice
            </button>
          </div>
        </div>

        {/* KITCHEN INBOX */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-xl mb-6">
           <h2 className="text-emerald-400 font-semibold tracking-wider text-sm uppercase mb-2">Kitchen Inbox</h2>
           <textarea
             className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none apple-transition transition-all duration-300"
             rows="3"
             placeholder="Allergies, spice preferences, or a special request..."
           ></textarea>
           <div className="flex justify-end mt-4">
             <button className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl apple-transition active:scale-95 shadow-md">
               Send to Kitchen
             </button>
           </div>
        </div>

        {/* FOOTER: Fixed Location */}
        <div className="text-center mt-12 pb-8">
          <p className="text-slate-500 text-sm font-medium">
            Cooked with care by Lunchmate • <span className="text-emerald-500">Kakinada</span>
          </p>
        </div>

      </div>
    </div>
  );
}
