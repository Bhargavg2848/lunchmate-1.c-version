import React, { useState, useEffect } from "react";
import api from "../lib/api";

export default function AdminInbox() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, this will fetch from api.get("/feedback")
    // For now, loading the exact layout with mock data to ensure it fits your Admin OS
    setTimeout(() => {
      setMessages([
        { id: 1, customer: "Aarav", text: "Less spice please!", date: "Today, 08:30 AM", status: "new" },
        { id: 2, customer: "Venkat", text: "Traveling tomorrow, skip meal.", date: "Yesterday, 06:15 PM", status: "read" }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const markAsRead = (id) => {
    setMessages(messages.map(m => m.id === id ? { ...m, status: "read" } : m));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Kitchen Inbox</h2>
      
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading messages...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Customer</th>
                <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Message</th>
                <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Received</th>
                <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.map(msg => (
                <tr key={msg.id} className={`hover:bg-slate-50 transition-colors ${msg.status === "new" ? "bg-emerald-50/30" : ""}`}>
                  <td className="p-4 font-medium text-slate-800">
                    {msg.customer}
                    {msg.status === "new" && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">NEW</span>}
                  </td>
                  <td className="p-4 text-slate-600">{msg.text}</td>
                  <td className="p-4 text-slate-500 text-sm">{msg.date}</td>
                  <td className="p-4">
                    {msg.status === "new" ? (
                      <button 
                        onClick={() => markAsRead(msg.id)}
                        className="text-xs font-semibold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        Mark Read
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
          <div className="p-12 text-center text-slate-500">No new messages from customers.</div>
        )}
      </div>
    </div>
  );
}
