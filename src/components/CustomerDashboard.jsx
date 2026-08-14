import React, { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";
import { Leaf } from "lucide-react"; // Make sure lucide-react is installed

export default function CustomerDashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [dbCustomer, setDbCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRealData() {
      if (!user) return;
      try {
        // Fetch the REAL customer record from Supabase
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("clerk_user_id", user.id)
          .single();
        
        if (data) setDbCustomer(data);
      } catch (err) {
        console.error("Failed to load customer data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRealData();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500">Loading your kitchen...</div>;
  }

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
              src={user?.imageUrl || "https://ui-avatars.com/api/?name=User"} 
              alt="Profile" 
              className="w-14 h-14 rounded-full border-2 border-emerald-500/40 shadow-lg object-cover"
            />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Hi, {user?.firstName || dbCustomer?.name || "Guest"}
              </h1>
              {/* Actual Gmail Address */}
              <p className="text-sm text-slate-400">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          
          <button 
            onClick={() => signOut()}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-full apple-transition active:scale-95 border border-slate-700"
          >
            Logout
          </button>
        </div>

        {/* SUBSCRIPTION DATA (Ready to be wired to your orders table) */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-xl mb-6">
          <h2 className="text-emerald-400 font-semibold tracking-wider text-sm uppercase mb-2">Active Plan</h2>
          <h3 className="text-3xl font-bold text-white mb-6">South Indian Pack - Vegetarian</h3>
          
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400 text-sm mb-1">Credits Remaining</p>
              <p className="text-2xl font-bold text-white">
                <span className="text-emerald-500">3</span> / 3
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400 text-sm mb-1">Pending Meals</p>
              <p className="text-2xl font-bold text-white text-amber-500">3</p>
            </div>
          </div>

          <div className="flex gap-4">
            {/* Glossy Apple-style primary button */}
            <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl shadow-[0_0_20px_rgba(5,150,105,0.3)] apple-transition active:scale-[0.97]">
              View Menu Schedule
            </button>
            {/* Added Invoice Button */}
            <button className="px-6 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 rounded-xl border border-slate-700 apple-transition active:scale-[0.97]">
              Download Invoice
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
