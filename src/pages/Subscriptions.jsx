import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function Subscriptions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function fetchTracker() {
    setLoading(true);
    const { data } = await supabase.from('subscription_overview').select('*');
    if (data) setSubs(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchTracker();
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading tracker...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header Section with Buttons */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">LUNCHMATE CUSTOMER TRACKER</h1>
        
        <div className="flex items-center gap-4">
          <Link
            to="/tracker"
            className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            ?? View Financial Tracker
          </Link>
          <button
            type="button"
            onClick={fetchTracker}
            className="text-sm text-green-700 font-medium hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Clean Table Layout */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Customer</th>
              <th className="p-4 font-semibold text-gray-600">Contact</th>
              <th className="p-4 font-semibold text-gray-600">Plan</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((sub) => (
              <tr 
                key={sub.subscription_order_id} 
                onClick={() => navigate(`/subscriptions/${sub.subscription_order_id}`)} 
                className="border-b cursor-pointer hover:bg-green-50 transition-colors"
              >
                <td className="p-4 font-bold text-green-700">{sub.customer_name} <span className="text-xs font-normal text-gray-400">[{sub.customer_id}]</span></td>
                <td className="p-4 text-gray-700">{sub.customer_contact}</td>
                <td className="p-4 text-gray-700">{sub.plan_name || 'Ongoing Package'}</td>
                <td className="p-4">
                  <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-full text-xs font-medium">
                    {sub.pending_count > 0 ? 'Active' : 'Completed'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

