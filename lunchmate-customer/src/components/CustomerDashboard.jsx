import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const CustomerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [todayMeal, setTodayMeal] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Get Logged-in User
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        // For demonstration purposes, if not logged in, we'll try to pick the first customer
        // In a real app, you'd redirect to login
        const { data: customers } = await supabase.from('customers').select('*').limit(1);
        if (customers && customers.length > 0) {
          await loadDataForCustomer(customers[0]);
        } else {
          setError('No user logged in and no customers found.');
        }
      } else {
        const { data: customerData, error: custError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (custError) throw custError;
        await loadDataForCustomer(customerData);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDataForCustomer = async (cust) => {
    setCustomer(cust);

    // 2. Fetch Subscription (Active order with remaining credits)
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', cust.id)
      .eq('order_type', 'subscription')
      .gt('plan_credits', 0)
      .order('created_at', { ascending: false });

    if (orders && orders.length > 0) {
      // Find one where credits are still available
      const activeSub = orders.find(o => o.credits_used < o.plan_credits);
      setSubscription(activeSub || null);
    }

    // 3. Fetch Today's Meal
    const today = new Date().toISOString().split('T')[0];
    const { data: deliveries, error: delError } = await supabase
      .from('deliveries')
      .select('*')
      .eq('scheduled_date', today)
      .in('order_id', orders?.map(o => o.id) || [])
      .single();

    if (deliveries) {
      setTodayMeal(deliveries);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hello, {customer?.name || 'Customer'}</h1>
          <p className="text-gray-500 text-sm">Welcome back to your dashboard</p>
        </div>
        <div className="bg-orange-100 p-2 rounded-full">
          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Meal */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-orange-500 p-4 text-white">
            <h2 className="font-semibold text-lg flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Today's Meal
            </h2>
          </div>
          <div className="p-6">
            {todayMeal ? (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{todayMeal.meal_name_snapshot}</h3>
                  <p className="text-gray-500 capitalize">{todayMeal.meal_slot} delivery</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    todayMeal.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    todayMeal.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {todayMeal.status.charAt(0).toUpperCase() + todayMeal.status.slice(1)}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">Scheduled for today</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 italic">No meal scheduled for today.</p>
              </div>
            )}
          </div>
        </div>

        {/* My Subscription */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">My Subscription</h2>
          {subscription ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wider">Credits Remaining</p>
                <div className="flex items-end space-x-2">
                  <span className="text-3xl font-bold text-orange-600">
                    {subscription.plan_credits - subscription.credits_used}
                  </span>
                  <span className="text-gray-400 pb-1">/ {subscription.plan_credits}</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full" 
                  style={{ width: `${(subscription.credits_used / subscription.plan_credits) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 italic">Active since {new Date(subscription.created_at).toLocaleDateString()}</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-3">No active subscription</p>
              <button className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                Explore Plans
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Status Card (Extended View) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Delivery Status</h2>
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {todayMeal?.status === 'delivered' ? 'Your meal was delivered' : 
               todayMeal?.status === 'pending' ? 'Out for delivery' : 
               'No active deliveries'}
            </p>
            <p className="text-xs text-gray-500">
              {customer?.address || 'No address on file'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
