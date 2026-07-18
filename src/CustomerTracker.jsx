import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase'; // Pointing to your correct Supabase setup

export default function CustomerTracker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // Fetching from your live, working data source
    const { data: trackerData, error } = await supabase
      .from('subscription_overview')
      .select('*')
      .order('next_delivery_date', { ascending: true });

    if (error) {
      console.error('Error fetching data:', error);
    } else {
      setData(trackerData || []);
    }
    setLoading(false);
  }

  if (loading) return <div className='p-6 text-gray-500'>Loading Financial Tracker...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">LUNCHMATE FINANCIAL TRACKER</h2>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Customer</th>
              <th className="p-4 font-semibold text-gray-600">Order ID</th>
              <th className="p-4 font-semibold text-gray-600">Package</th>
              <th className="p-4 font-semibold text-gray-600">Balance Due</th>
              <th className="p-4 font-semibold text-gray-600">Days Left</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row.subscription_order_id || index} className="border-b hover:bg-gray-50">
                <td className="p-4 font-bold text-gray-800">{row.customer_name}</td>
                <td className="p-4 font-mono text-xs text-gray-500">
                  {row.order_id || <span className="italic">N/A</span>}
                </td>
                <td className="p-4 text-gray-700">{row.plan_name || 'Ongoing'}</td>
                <td className="p-4 font-bold text-red-600">
                  {Number(row.amount_due) > 0 ? `Rs.${Number(row.amount_due).toFixed(2)}` : 'Rs.0.00'}
                </td>
                <td className="p-4 font-bold text-indigo-600">{row.credits_remaining}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${
                    row.subscription_state === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                    row.subscription_state === 'completed' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {row.subscription_state?.replace('_', ' ')}
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
