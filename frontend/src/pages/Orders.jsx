import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { ShoppingBag, Eye, RotateCcw, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const STATUS_COLORS = {
  Ordered:               'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Accepted:              'text-green-400 bg-green-500/10 border-green-500/20',
  Shipped:               'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Delivered:             'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Rejected:              'text-red-400 bg-red-500/10 border-red-500/20',
  Cancelled:             'text-red-400 bg-red-500/10 border-red-500/20',
  CancellationRequested: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  ReturnRequested:       'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Returned:              'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

const STATUS_LABELS = {
  CancellationRequested: '⏳ Cancel Pending',
  ReturnRequested:       '🔄 Return Pending',
  Returned:              '↩️ Returned',
};

const Orders = () => {
  const { token, addToast } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returnModal, setReturnModal] = useState(null); 
  const [returnReason, setReturnReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.get('/orders/my-orders', token);
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [token]);

  
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Request a cancellation? The seller must approve before your refund is issued.')) return;
    try {
      const res = await api.post(`/orders/cancel/${orderId}`, , token);
      addToast(res.message || 'Cancellation request submitted.', 'success');
      await fetchOrders();
    } catch (err) {
      addToast(err.message || 'Cancellation request failed', 'danger');
    }
  };

  
  const openReturnModal = (order) => {
    const daysLeft = order.date_delivered
      ? Math.max(0, 7 - Math.floor((Date.now() - new Date(order.date_delivered).getTime()) / (1000 * 60 * 60 * 24)))
      : 7;
    setReturnModal({ orderId: order._id, daysLeft });
    setReturnReason('');
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!returnReason.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/orders/return/${returnModal.orderId}`, { reason: returnReason }, token);
      addToast(res.message || 'Return request submitted.', 'success');
      setReturnModal(null);
      await fetchOrders();
    } catch (err) {
      addToast(err.message || 'Return request failed.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIndex = (status) => ['Ordered', 'Accepted', 'Shipped', 'Delivered'].indexOf(status);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '10rem 0' }}>
        <p style={{ color: '#6B7280' }}>Loading your orders…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] px-4 py-12">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase">Order History</h1>
          <p className="mt-4 text-gray-400">Track your purchases and manage returns.</p>
        </div>

        <div className="space-y-8">
          {orders.map((order) => {
            const currentIdx = getStatusIndex(order.status);
            const isDelivered = order.status === 'Delivered';
            const isClosed = ['Cancelled', 'Rejected', 'Returned'].includes(order.status);
            const isPendingAction = ['CancellationRequested', 'ReturnRequested'].includes(order.status);

            
            const daysLeft = order.date_delivered
              ? Math.max(0, 7 - Math.floor((Date.now() - new Date(order.date_delivered).getTime()) / (1000 * 60 * 60 * 24)))
              : null;
            const canReturn = isDelivered && daysLeft !== null && daysLeft > 0;

            return (
              <div key={order._id} className="bg-[#16191D] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">

                
                <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-wrap justify-between items-center gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Order Number</p>
                    <h3 className="text-xl font-bold text-white">#LC-{order._id.substring(order._id.length - 8).toUpperCase()}</h3>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Date Placed</p>
                    <p className="text-sm text-gray-300 font-medium">
                      {new Date(order.date_ordered).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Amount</p>
                    <p className={`text-xl font-bold ${isClosed ? 'text-gray-500 line-through' : 'text-green-400'}`}>
                      ₹{order.total_price.toFixed(2)}
                    </p>
                  </div>

                  
                  <div className="flex items-center gap-3 flex-wrap">
                    
                    <div className={`px-4 py-1.5 border rounded-full text-xs font-bold uppercase tracking-widest ${STATUS_COLORS[order.status] || 'text-blue-400 bg-blue-500/10 border-blue-500/20'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </div>

                    
                    {['Ordered', 'Accepted'].includes(order.status) && (
                      <button
                        onClick={() => handleCancelOrder(order._id)}
                        className="px-5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-bold text-red-400 uppercase tracking-widest hover:bg-red-500/20 transition-all active:scale-95"
                      >
                        Request Cancel
                      </button>
                    )}

                    
                    {canReturn && (
                      <button
                        onClick={() => openReturnModal(order)}
                        className="flex items-center gap-1.5 px-5 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-bold text-orange-400 uppercase tracking-widest hover:bg-orange-500/20 transition-all active:scale-95"
                      >
                        <RotateCcw size={11} />
                        Return ({daysLeft}d left)
                      </button>
                    )}

                    
                    {isDelivered && daysLeft === 0 && (
                      <div className="px-4 py-1.5 bg-gray-500/10 border border-gray-500/20 rounded-full">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Return Window Expired</span>
                      </div>
                    )}

                    <Link
                      to={`/receipt/${order._id}`}
                      className="p-2 hover:bg-white/5 rounded-full transition-all text-gray-500 hover:text-white"
                      title="View Receipt"
                    >
                      <Eye size={20} />
                    </Link>
                  </div>
                </div>

                
                {isPendingAction && (
                  <div className={`px-8 py-4 border-b border-white/5 flex items-center gap-3 ${
                    order.status === 'ReturnRequested' ? 'bg-orange-500/5' : 'bg-amber-500/5'
                  }`}>
                    <AlertTriangle size={16} className={order.status === 'ReturnRequested' ? 'text-orange-400' : 'text-amber-400'} />
                    <div>
                      <p className={`text-xs font-black uppercase tracking-widest ${
                        order.status === 'ReturnRequested' ? 'text-orange-400' : 'text-amber-400'
                      }`}>
                        {order.status === 'ReturnRequested' ? 'Return Requested' : 'Cancellation Requested'} — Awaiting Seller Response
                      </p>
                      {order.status === 'ReturnRequested' && order.return_reason && (
                        <p className="text-[10px] text-gray-500 mt-0.5">Reason: "{order.return_reason}"</p>
                      )}
                    </div>
                  </div>
                )}

                {order.status === 'Returned' && (
                  <div className="px-8 py-4 border-b border-white/5 bg-cyan-500/5 flex items-center gap-3">
                    <CheckCircle size={16} className="text-cyan-400" />
                    <p className="text-xs font-black text-cyan-400 uppercase tracking-widest">
                      Return Accepted — ₹{order.total_price.toFixed(2)} refunded to your account
                    </p>
                  </div>
                )}

                {isClosed && order.status !== 'Returned' && (
                  <div className="px-8 py-4 border-b border-white/5 bg-red-500/5 flex items-center gap-3">
                    <XCircle size={16} className="text-red-400" />
                    <p className="text-xs font-black text-red-400 uppercase tracking-widest">
                      This order has been {order.status.toLowerCase()}
                    </p>
                  </div>
                )}

                
                {!isClosed && !isPendingAction && (
                  <div className="px-8 py-10 bg-black/20">
                    <div className="relative flex justify-between">
                      <div className="absolute top-4 left-0 w-full h-0.5 bg-white/10" />
                      {['Ordered', 'Accepted', 'Shipped', 'Delivered'].map((step, idx) => {
                        const isDone = idx <= currentIdx;
                        return (
                          <div key={idx} className="relative z-10 flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full border-4 transition-all duration-500 ${
                              isDone
                                ? 'bg-blue-500 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                : 'bg-[#1C2025] border-white/10'
                            }`} />
                            <span className={`mt-3 text-[10px] font-bold uppercase tracking-tighter ${isDone ? 'text-white' : 'text-gray-600'}`}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    
                    {isDelivered && daysLeft !== null && daysLeft > 0 && (
                      <div className="mt-6 flex items-center gap-2 justify-center">
                        <Clock size={13} className="text-orange-400" />
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                          Return window: {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                        </span>
                      </div>
                    )}
                  </div>
                )}

                
                <div className="p-8 space-y-6">
                  {order.items?.map((order_item, oiIdx) => (
                    <div key={oiIdx} className="flex items-center gap-6 group">
                      <div className="w-16 h-16 bg-[#1C2025] rounded-xl overflow-hidden border border-white/5 flex-shrink-0 p-1">
                        <img
                          src={order_item.item?.user_file}
                          alt={order_item.item?.name}
                          className="w-full h-full object-cover rounded-lg mix-blend-lighten"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600'; }}
                        />
                      </div>
                      <div className="flex-grow">
                        <h4 className="text-white font-bold">{order_item.item?.name}</h4>
                        <p className="text-xs text-gray-500">Qty: {order_item.quantity} &bull; ₹{order_item.price.toFixed(2)} each</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-300 font-bold">₹{(order_item.price * order_item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="text-center py-20 bg-[#16191D] rounded-[3rem] border border-white/5">
              <ShoppingBag size={48} color="#374151" style={{ margin: '0 auto 1rem' }} />
              <p className="text-gray-400 text-xl font-medium">You haven't placed any orders yet.</p>
              <Link to="/market" className="inline-block mt-8 px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all shadow-xl active:scale-95">
                Browse Market
              </Link>
            </div>
          )}
        </div>
      </div>

      
      {returnModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setReturnModal(null); }}
        >
          <div style={{ backgroundColor: '#16191D', borderRadius: '1.5rem', border: '1px solid rgba(255,165,0,0.2)', padding: '2rem', width: '100%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RotateCcw size={16} color="#f97316" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem', color: '#ffffff' }}>Request a Return</h3>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#f97316', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {returnModal.daysLeft} day{returnModal.daysLeft !== 1 ? 's' : ''} remaining in return window
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Tell the seller why you'd like to return this order. If approved, your full payment of <strong style={{ color: '#fff' }}>₹{orders.find(o => o._id === returnModal.orderId)?.total_price.toFixed(2)}</strong> will be refunded.
            </p>

            <form onSubmit={handleSubmitReturn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: '800', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>Reason for Return *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Item arrived damaged, wrong product received, not as described…"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#0F1115', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '0.75rem 1rem', color: '#fff', outline: 'none', resize: 'vertical', fontSize: '0.875rem', lineHeight: 1.6 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', color: '#fff', fontWeight: '800', borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: submitting ? 0.6 : 1 }}
                >
                  {submitting ? 'Submitting…' : 'Submit Return Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setReturnModal(null)}
                  style={{ padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280', fontWeight: '800', borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.75rem', textTransform: 'uppercase' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
