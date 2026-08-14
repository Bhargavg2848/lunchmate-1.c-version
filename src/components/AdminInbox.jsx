import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const CATEGORY_LABELS = {
  dietary: "Dietary",
  preference: "Preference",
  delivery: "Delivery",
  feedback: "Feedback",
  general: "General",
};

export default function AdminInbox() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState(null);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const { data, error: fetchErr } = await supabase
        .from("customer_feedback")
        .select("id, customer_name, message, category, is_read, created_at, customers ( name, contact )")
        .order("created_at", { ascending: false })
        .limit(100);
      if (fetchErr) throw fetchErr;
      setMessages(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const timer = setInterval(() => fetchMessages(true), 30000);
    return () => clearInterval(timer);
  }, [fetchMessages]);

  const markAsRead = async (id) => {
    setMarkingId(id);
    try {
      const { error: upErr } = await supabase
        .from("customer_feedback")
        .update({ is_read: true })
        .eq("id", id);
      if (upErr) throw upErr;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
    } catch (err) {
      setError(err.message);
    } finally {
      setMarkingId(null);
    }
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchen Inbox</h1>
          <p className="text-gray-500">Notes, preferences and feedback from the customer portal</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {unreadCount} new
            </span>
          )}
          <button
            onClick={() => fetchMessages()}
            className="text-xs font-semibold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading messages...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Customer</th>
                <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Category</th>
                <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Message</th>
                <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Received</th>
                <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.map((msg) => (
                <tr key={msg.id} className={`hover:bg-slate-50 transition-colors ${!msg.is_read ? "bg-emerald-50/30" : ""}`}>
                  <td className="p-4 font-medium text-slate-800">
                    {msg.customer_name || msg.customers?.name || "Customer"}
                    {msg.customers?.contact && (
                      <div className="text-xs text-slate-400 font-normal">{msg.customers.contact}</div>
                    )}
                    {!msg.is_read && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        NEW
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                      {CATEGORY_LABELS[msg.category] || "General"}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 max-w-md">{msg.message}</td>
                  <td className="p-4 text-slate-500 text-sm whitespace-nowrap">{fmtDate(msg.created_at)}</td>
                  <td className="p-4">
                    {!msg.is_read ? (
                      <button
                        onClick={() => markAsRead(msg.id)}
                        disabled={markingId === msg.id}
                        className="text-xs font-semibold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {markingId === msg.id ? "Saving..." : "Mark Read"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium px-3 py-1.5">Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && messages.length === 0 && (
          <div className="p-12 text-center text-slate-500">No messages from customers yet.</div>
        )}
      </div>
    </div>
  );
}
