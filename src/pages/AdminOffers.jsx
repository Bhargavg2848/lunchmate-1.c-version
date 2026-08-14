import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import Alert from "../components/Alert";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const STATUS_STYLE = {
  pending: "bg-yellow-100 text-yellow-800",
  successful: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function AdminOffers() {
  const [offer, setOffer] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [customerNames, setCustomerNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creditingId, setCreditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [offerRes, refRes, custRes] = await Promise.all([
        supabase.from("business_settings").select("value").eq("key", "referral").maybeSingle(),
        supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("customers").select("id, name, contact, customer_id_lm"),
      ]);
      if (offerRes.error) throw offerRes.error;
      if (refRes.error) throw refRes.error;
      setOffer(
        offerRes.data?.value ?? { reward_meals: 1, active: true, message: "" }
      );
      setReferrals(refRes.data || []);
      const map = {};
      (custRes.data || []).forEach((c) => {
        map[c.id] = c;
      });
      setCustomerNames(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveOffer = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { error: upErr } = await supabase
        .from("business_settings")
        .update({ value: offer, updated_at: new Date().toISOString() })
        .eq("key", "referral");
      if (upErr) throw upErr;
      setSuccess("Offer settings saved. The customer portal now uses these values.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const markSuccessful = async (id) => {
    setCreditingId(id);
    setError("");
    try {
      const { error: rpcErr } = await supabase.rpc("credit_referral_reward", { p_referral_id: id });
      if (rpcErr) throw rpcErr;
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreditingId(null);
    }
  };

  const nameOf = (id) => {
    const c = customerNames[id];
    return c ? `${c.name || "Customer"}${c.customer_id_lm ? ` (${c.customer_id_lm})` : ""}` : "—";
  };

  if (loading || !offer) {
    return <div className="p-8 text-center text-slate-500">Loading offers...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="admin-offers-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Offers &amp; Coupons</h1>
        <p className="text-gray-500">Referral rewards shown in the customer portal</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError("")} />
      <Alert type="success" message={success} onClose={() => setSuccess("")} />

      <form onSubmit={saveOffer} className="bg-white shadow-sm rounded-xl border border-slate-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">Referral offer</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1" htmlFor="referral-reward-input">
              Reward (free meals)
            </label>
            <input
              id="referral-reward-input"
              data-testid="referral-reward-input"
              type="number"
              min="1"
              max="10"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={offer.reward_meals ?? 1}
              onChange={(e) => setOffer((o) => ({ ...o, reward_meals: Number(e.target.value) || 1 }))}
            />
            <p className="text-[11px] text-slate-400 mt-1">Credited to the referrer when the friend&apos;s subscription starts.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1" htmlFor="referral-active-toggle">
              Status
            </label>
            <button
              id="referral-active-toggle"
              data-testid="referral-active-toggle"
              type="button"
              onClick={() => setOffer((o) => ({ ...o, active: !o.active }))}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                offer.active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-500 border-slate-300"
              }`}
            >
              {offer.active ? "Active" : "Paused"}
            </button>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1" htmlFor="referral-message-input">
              Customer-facing message
            </label>
            <textarea
              id="referral-message-input"
              data-testid="referral-message-input"
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={offer.message ?? ""}
              onChange={(e) => setOffer((o) => ({ ...o, message: e.target.value }))}
              placeholder="Refer a friend — earn 1 free meal when they subscribe."
            />
          </div>
        </div>
        <button
          type="submit"
          data-testid="referral-save-button"
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save offer"}
        </button>
      </form>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-gray-900">Referrals</h2>
        </div>
        <table className="w-full text-left border-collapse" data-testid="referrals-table">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Referrer</th>
              <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Friend</th>
              <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Code</th>
              <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Status</th>
              <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Date</th>
              <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider w-40">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {referrals.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors" data-testid={`admin-referral-row-${r.id}`}>
                <td className="p-4 font-medium text-slate-800">{nameOf(r.referrer_customer_id)}</td>
                <td className="p-4 text-slate-600">{nameOf(r.referee_customer_id)}</td>
                <td className="p-4 font-mono text-xs text-slate-500">{r.code}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[r.status] || STATUS_STYLE.pending}`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-4 text-slate-500 text-sm whitespace-nowrap">{fmtDate(r.created_at)}</td>
                <td className="p-4">
                  {r.status === "pending" ? (
                    <button
                      onClick={() => markSuccessful(r.id)}
                      disabled={creditingId === r.id}
                      data-testid={`admin-referral-credit-${r.id}`}
                      className="text-xs font-semibold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {creditingId === r.id ? "Crediting..." : `Credit +${r.reward_meals} meal`}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium px-3 py-1.5">
                      {r.status === "successful" ? `+${r.reward_meals} credited` : "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {referrals.length === 0 && (
          <div className="p-12 text-center text-slate-500">No referrals yet.</div>
        )}
      </div>
    </div>
  );
}
