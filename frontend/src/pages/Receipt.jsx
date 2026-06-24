import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Printer } from 'lucide-react';

const Receipt = () => {
  const { id } = useParams();
  const { token } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      setLoading(true);
      try {
        // Fetch order details via api client
        const data = await api.get(`/orders/receipt/${id}`, token);
        setOrder(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchOrderDetails();
    }
  }, [id, token]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '10rem 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading receipt details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <h2 className="text-white text-2xl font-black mb-4">Receipt Not Found</h2>
        <Link to="/orders" className="btn btn-primary">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-12 text-gray-900" style={{ margin: '-2rem' }}>
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-16 rounded-lg shadow-sm border border-gray-100 receipt-container">
        
        {/* Receipt Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-10 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-black">
              LUCKY<span className="text-yellow-600">CART</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold">Official Transaction Receipt</p>
          </div>
          <div className="mt-6 md:mt-0 text-right">
            <h2 className="text-xl font-bold text-gray-900">INVOICE</h2>
            <p className="text-gray-500 text-sm">#LC-{order._id.substring(order._id.length - 8).toUpperCase()}</p>
            <p className="text-gray-500 text-sm">
              {new Date(order.date_ordered).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Billing Info */}
        <div className="grid grid-cols-2 gap-12 mb-16">
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Billed To</h3>
            <p className="text-xl font-bold text-black">{order.user?.username}</p>
            <p className="text-gray-500 text-sm">{order.user?.email_address}</p>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Payment Method</h3>
            <p className="text-sm font-bold text-black">Account Balance</p>
            <p className="text-gray-500 text-sm">Transaction Successful</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-16 overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr class="border-b border-gray-100">
                <th className="py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Item Description</th>
                <th className="py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Qty</th>
                <th className="py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Price</th>
                <th className="py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.items?.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-6">
                    <p className="font-bold text-black">{item.item?.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{item.item?.category}</p>
                  </td>
                  <td className="py-6 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-6 text-right text-gray-600">₹{item.price.toFixed(2)}</td>
                  <td className="py-6 text-right font-bold text-black">₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex justify-end border-t border-gray-100 pt-10">
          <div className="w-full md:w-1/3 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="font-bold text-gray-900">₹{order.total_price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tax</span>
              <span className="font-bold text-gray-900">₹0.00</span>
            </div>
            <div className="flex justify-between text-2xl font-black border-t border-black pt-4">
              <span className="text-black uppercase tracking-tighter">Total Paid</span>
              <span className="text-black tracking-tighter">₹{order.total_price.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-24 text-center border-t border-gray-50 pt-10">
          <p className="text-sm font-bold text-black">Thank you for your business!</p>
          <p className="text-xs text-gray-400 mt-2">Lucky Cart | Premium Digital Exchange</p>
        </div>
      </div>

      {/* Actions */}
      <div className="max-w-4xl mx-auto mt-12 flex justify-between items-center no-print">
        <Link to="/orders" className="text-sm font-bold text-gray-500 hover:text-black transition-all flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Orders
        </Link>
        <button 
          onClick={() => window.print()}
          className="px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-all shadow-xl flex items-center gap-2"
        >
          <Printer size={16} />
          Print Receipt
        </button>
      </div>
    </div>
  );
};

export default Receipt;
