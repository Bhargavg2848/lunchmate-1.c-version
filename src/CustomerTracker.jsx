import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function CustomerTracker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: trackerData, error } = await supabase
      .from('customer_tracker_excel_view')
      .select('*');

    if (error) {
      console.error('Error fetching data:', error);
    } else {
      setData(trackerData);
    }
    setLoading(false);
  }

  if (loading) return <div className='p-4'>Loading Tracker...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">LUNCHMATE CUSTOMER TRACKER</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Customer ID</th>
              <th className="border p-2">Order ID</th>
              <th className="border p-2">Package</th>
              <th className="border p-2">Balance</th>
              <th className="border p-2">Days Left</th>
              <th className="border p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className='hover:bg-gray-50'>
                <td className="border p-2 font-medium">{row['CUSTOMER ID']}</td>
                <td className="border p-2">{row['ORDER ID']}</td>
                <td className="border p-2">{row['PACKAGE']}</td>
                <td className="border p-2 text-red-600 font-bold">₹{row['BALANCE']}</td>
                <td className="border p-2 font-bold">{row['DAYS REMAINING']}</td>
                <td className="border p-2">{row['STATUS']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
