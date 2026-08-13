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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-5 font-sans">
      <div className="w-full max-w-md bg-emerald-950/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 shadow-2xl relative z-10 text-center">
        
        <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg mb-6">
          <ChefHat className="h-8 w-8 text-white" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-white mb-2">Welcome back.</h1>
        <p className="text-emerald-100/70 text-sm mb-6">Sign in with Google to manage today's meal, skip any day, and whisper notes to the chef.</p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full h-14 bg-white text-slate-900 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-100 active:scale-95 transition-all mb-4 shadow-lg cursor-pointer"
        >
          {loading ? "Connecting to Google..." : (
            <>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
              Continue with Google
            </>
          )}
        </button>

        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 py-3 rounded-xl"><ShieldCheck className="h-4 w-4 mx-auto text-emerald-400 mb-1" /><div className="text-[9px] uppercase tracking-widest text-emerald-200/70">256-Bit</div></div>
          <div className="bg-white/5 py-3 rounded-xl"><Sparkles className="h-4 w-4 mx-auto text-amber-300 mb-1" /><div className="text-[9px] uppercase tracking-widest text-emerald-200/70">No Password</div></div>
          <div className="bg-white/5 py-3 rounded-xl"><ChefHat className="h-4 w-4 mx-auto text-emerald-400 mb-1" /><div className="text-[9px] uppercase tracking-widest text-emerald-200/70">7-Day Auth</div></div>
        </div>
      </div>
    </div>
  );
}
