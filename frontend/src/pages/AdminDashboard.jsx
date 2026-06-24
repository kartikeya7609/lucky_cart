import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Download, LogOut, ShieldAlert, Award } from 'lucide-react';

const AdminDashboard = () => {
  const { token, logout, addToast } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.get('/admin/orders', token);
      setOrders(data || []);
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Access Denied.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const handleExport = async () => {
    try {
      addToast('Preparing export…', 'success');
      // Must use fetch directly so we can pass the Authorization header
      const res = await fetch('/api/admin/export-csv', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lucky_cart_export_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast('Database exported successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Export failed.', 'danger');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] px-4 py-12">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase">Admin Panel</h1>
            <p className="text-amber-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
              Global Protocol Override • Active Session
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleExport}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Download size={14} />
              Download Database (CSV)
            </button>
            <button 
              onClick={logout}
              className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all flex items-center gap-1.5"
            >
              <LogOut size={12} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-[#16191D] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">System Orders</h2>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <p className="p-8 text-center text-gray-500">Loading system orders...</p>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 text-gray-600 italic">
                No orders found in the system.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <th className="px-8 py-6">ID</th>
                    <th className="px-8 py-6">User</th>
                    <th className="px-8 py-6">Total Amount</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {orders.map((order) => (
                    <tr key={order._id} className="group hover:bg-white/[0.01] transition-all">
                      <td className="px-8 py-6 font-mono text-gray-400 text-xs">
                        #LC-{order._id.substring(order._id.length - 8).toUpperCase()}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-[10px] text-gray-400">
                            {order.user?.username ? order.user.username[0].toUpperCase() : 'U'}
                          </div>
                          <span className="text-sm font-bold text-white">{order.user?.username || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-black text-green-400">₹{order.total_price.toFixed(2)}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          order.status === 'Delivered'
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : order.status === 'Cancelled' || order.status === 'Rejected'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-xs text-gray-500 font-bold uppercase tracking-widest">
                        {new Date(order.date_ordered).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
