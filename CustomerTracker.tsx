import React, { useState, useEffect } from 'react';
// Make sure this path matches where your Supabase client is initialized
import { supabase } from '../supabaseClient'; 

export default function CustomerTracker() {
  const [trackerData, setTrackerData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrackerData();
  }, []);

  async function fetchTrackerData() {
    setIsLoading(true);
    
    // Fetching from your customers and joined subscriptions table
    const { data, error } = await supabase
      .from('customers')
      .select(`
        customer_id,
        subscriptions (
          order_id,
          package_name,
          plan,
          amount,
          paid,
          start_date,
          end_date,
          status
        )
      `);

    if (error) {
      console.error("Error fetching tracker data:", error.message);
      setIsLoading(false);
      return;
    }

    // Flatten the data so it maps exactly to your Excel sheet structure
    const flattenedData = [];
    data.forEach(customer => {
      customer.subscriptions.forEach(sub => {
        // Calculate days remaining automatically
        const today = new Date();
        const endDate = new Date(sub.end_date);
        const timeDiff = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

        flattenedData.push({
          customerId: customer.customer_id,
          orderId: sub.order_id,
          package: sub.package_name,
          plan: sub.plan,
          amount: sub.amount,
          paid: sub.paid,
          balance: sub.amount - sub.paid,
          start: sub.start_date,
          end: sub.end_date,
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          status: sub.status
        });
      });
    });

    setTrackerData(flattenedData);
    setIsLoading(false);
  }

  if (isLoading) {
    return <div className="p-8 text-center font-semibold text-gray-600">Loading Tracker Data...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">LUNCHMATE CUSTOMER TRACKER</h2>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          onClick={() => alert("Export to Excel module will be wired here!")}
        >
          Export to Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100">
            <tr>
              <th className="px-4 py-3">Customer ID</th>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Days Remaining</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {trackerData.map((row, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{row.customerId}</td>
                <td className="px-4 py-3">{row.orderId}</td>
                <td className="px-4 py-3">{row.package}</td>
                <td className="px-4 py-3">{row.plan}</td>
                <td className="px-4 py-3">₹{row.amount}</td>
                <td className="px-4 py-3">₹{row.paid}</td>
                <td className={`px-4 py-3 font-bold ${row.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{row.balance}
                </td>
                <td className="px-4 py-3">{row.start}</td>
                <td className="px-4 py-3">{row.end}</td>
                <td className={`px-4 py-3 font-bold ${row.daysRemaining <= 3 ? 'text-orange-500' : 'text-gray-700'}`}>
                  {row.daysRemaining}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    row.status === 'On Going' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {trackerData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No active customers found.
          </div>
        )}
      </div>
    </div>
  );
}