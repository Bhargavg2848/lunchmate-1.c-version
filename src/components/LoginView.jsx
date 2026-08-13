import React, { useState } from "react";
import { ChefHat, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function LoginView() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/#/portal"
        }
      });

      if (error) throw error;
    } catch (err) {
      setErrorMsg(err.message || "Google sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-5 font-sans relative overflow-hidden">
      
      {/* Animated Background Glowing Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse delay-1000"></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10 text-center animate-fade-in">
        
        <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6 transform hover:scale-105 transition-transform duration-300">
          <ChefHat className="h-10 w-10 text-white animate-bounce" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Welcome back.</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">Sign in with Google to manage today's meal, skip any day, and whisper notes to the chef.</p>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full h-14 bg-white text-slate-900 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-100 active:scale-95 transition-all shadow-xl shadow-white/5 cursor-pointer"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting to Google...</span>
            </div>
          ) : (
            <>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/[0.03] hover:bg-white/[0.06] transition-colors py-3.5 rounded-2xl border border-white/5">
            <ShieldCheck className="h-4 w-4 mx-auto text-emerald-400 mb-1.5" />
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">256-Bit</div>
          </div>
          <div className="bg-white/[0.03] hover:bg-white/[0.06] transition-colors py-3.5 rounded-2xl border border-white/5">
            <Sparkles className="h-4 w-4 mx-auto text-amber-400 mb-1.5" />
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">No Password</div>
          </div>
          <div className="bg-white/[0.03] hover:bg-white/[0.06] transition-colors py-3.5 rounded-2xl border border-white/5">
            <ChefHat className="h-4 w-4 mx-auto text-emerald-400 mb-1.5" />
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">7-Day Auth</div>
          </div>
        </div>
      </div>
    </div>
  );
}
