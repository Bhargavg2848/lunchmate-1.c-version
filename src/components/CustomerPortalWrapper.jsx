import React, { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import DashboardView from "./DashboardView";
import { supabase } from "../lib/supabase";
import AccountLinkBridge from "./AccountLinkBridge";

export default function CustomerPortalWrapper() {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsLinking, setNeedsLinking] = useState(false);

  const fetchCustomerRecord = async () => {
    if (!clerkUser) return;
    setLoading(true);

    try {
      // 1. Check if this Clerk user is already linked to a Supabase customer
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("clerk_user_id", clerkUser.id)
        .single();

      if (data) {
        // 2. Account is linked! Map the data for DashboardView
        setCustomerData({
          ...data,
          name: data.name || clerkUser.fullName,
          email: clerkUser.primaryEmailAddress?.emailAddress || "",
          // Temporarily preserving your dummy variables until you connect the live tables
          credits: 12,
          totalCredits: 20,
          balanceDue: 500
        });
        setNeedsLinking(false);
      } else {
        // 3. No linked account found. Trigger the OTP bridge.
        setNeedsLinking(true);
      }
    } catch (err) {
      console.error("Error fetching customer data:", err);
      // Supabase throws an error if .single() finds 0 rows, so we trigger the bridge
      setNeedsLinking(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerRecord();
  }, [clerkUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Intercept the user with the bridging component if they aren't linked yet
  if (needsLinking) {
    return <AccountLinkBridge onLinked={fetchCustomerRecord} />;
  }

  if (!customerData) {
    return null;
  }

  return (
    <DashboardView
      user={customerData}
      onLogout={() => signOut()}
    />
  );
}
