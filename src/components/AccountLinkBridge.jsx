import React, { useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

export default function AccountLinkBridge({ onLinked }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyAndLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // 1. Check if a customer exists with this exact phone and PIN combo
      const { data: customer, error: searchError } = await supabase
        .from("customers")
        .select("*")
        .eq("contact", phoneNumber)
        .eq("pin", pin)
        .single();

      if (searchError || !customer) {
        setError("Invalid Phone Number or PIN. Please try again or contact support.");
        setLoading(false);
        return;
      }

      // 2. If it matches perfectly, link the Clerk ID to the database!
      const email = user.primaryEmailAddress?.emailAddress || "";
      
      const { error: updateError } = await supabase
        .from("customers")
        .update({ clerk_user_id: user.id, google_email: email })
        .eq("id", customer.id);

      if (updateError) throw updateError;

      // 3. Success! Tell the wrapper to reload and show the dashboard
      onLinked();
      
    } catch (err) {
      setError("Database connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Link Your Account</h2>
        <p className="text-gray-600 mb-6">
          To access your portal, please enter your registered phone number and your 4-digit Lunchmate PIN.
        </p>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
        
        <form onSubmit={verifyAndLink}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Registered Phone Number</label>
          <input
            type="text"
            placeholder="e.g. 8374925674"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 mb-4"
            required
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">4-Digit PIN</label>
          <input
            type="password"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 mb-6 tracking-widest text-lg"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 transition mb-3 shadow-md"
          >
            {loading ? "Verifying..." : "Secure Login"}
          </button>
          
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full text-gray-500 hover:text-gray-800 text-sm font-medium transition"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
