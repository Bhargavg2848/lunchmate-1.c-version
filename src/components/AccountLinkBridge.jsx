import React, { useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

export default function AccountLinkBridge({ onLinked }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneObj, setPhoneObj] = useState(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`;
      
      // 1. Check if the user already has this phone attached from a previous attempt
      let phoneRecord = user.phoneNumbers.find(p => p.phoneNumber === formattedPhone);
      
      // 2. If it doesn't exist on their account yet, create it
      if (!phoneRecord) {
        phoneRecord = await user.createPhoneNumber({ phoneNumber: formattedPhone });
      }

      // 3. Trigger the SMS code
      await phoneRecord.prepareVerification();
      
      setPhoneObj(phoneRecord);
      setStep(2);
    } catch (err) {
      const errorMsg = err.errors?.[0]?.message || "";
      if (errorMsg.toLowerCase().includes("reverification")) {
        setError("For security, your session is too old to link a phone. Please Sign Out and log back in to try again.");
      } else {
        setError(errorMsg || "Failed to send OTP. Please check the number.");
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyAndLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await phoneObj.attemptVerification({ code: otp });
      const email = user.primaryEmailAddress?.emailAddress || "";
      
      const { data, error: dbError } = await supabase
        .from("customers")
        .update({ clerk_user_id: user.id, google_email: email })
        .eq("contact", phoneNumber)
        .select();

      if (dbError) throw dbError;

      if (data && data.length > 0) {
        onLinked();
      } else {
        setError("Number verified, but no Lunchmate account found. Please contact admin.");
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Link Your Account</h2>
        <p className="text-gray-600 mb-6">
          To view your active subscriptions, please verify the phone number registered with Lunchmate.
        </p>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
        
        {step === 1 ? (
          <form onSubmit={sendOtp}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registered Phone Number</label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 mb-4"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 transition mb-3"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full text-gray-500 hover:text-gray-800 text-sm font-medium transition"
            >
              Sign out & Try again
            </button>
          </form>
        ) : (
          <form onSubmit={verifyAndLink}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter SMS Code</label>
            <input
              type="text"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 mb-4"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 transition"
            >
              {loading ? "Verifying..." : "Verify & Link Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
