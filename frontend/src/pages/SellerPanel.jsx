import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { 
  PlusCircle, 
  Upload, 
  List, 
  Package, 
  FileSpreadsheet, 
  Download,
  CheckCircle,
  XCircle,
  Truck,
  User,
  MapPin,
  Phone,
  Mail,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const SellerPanel = () => {
  const { token, user, addToast } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState('inventory');

  // Listings data
  const [myItems, setMyItems] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Inventory Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter & Paginate items
  const filteredItems = myItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.barcode && item.barcode.includes(searchQuery))
  );
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItemId, setEditItemId] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editFile, setEditFile] = useState(null);

  // Add Item State
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addStock, setAddStock] = useState('');
  const [addBarcode, setAddBarcode] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addImageUrl, setAddImageUrl] = useState('');
  const [addFile, setAddFile] = useState(null);

  // CSV Bulk Upload State
  const [csvFile, setCsvFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fetchSellerData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch my listings (requesting a high limit to get all items without pagination)
      const resListings = await api.get('/items/my-listings?limit=1000', token);
      setMyItems(Array.isArray(resListings) ? resListings : (resListings?.items || []));

      // 2. Fetch seller-specific orders (correct endpoint)
      const resOrders = await api.get('/orders/seller-orders', token);
      setSellerOrders(Array.isArray(resOrders) ? resOrders : []);
    } catch (err) {
      console.error('SellerPanel fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerData();
  }, [token]);

  // Handle Edit Modal Trigger
  const triggerEdit = (item) => {
    setEditItemId(item._id);
    setEditItemName(item.name);
    setEditPrice(item.price);
    setEditStock(item.stock);
    setEditImageUrl(item.user_file.startsWith('http') ? item.user_file : '');
    setEditFile(null);
    setShowEditModal(true);
  };

  // Submit Edit Listing
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('price', editPrice);
      formData.append('stock', editStock);
      if (editImageUrl) formData.append('cloudinary_url', editImageUrl);
      if (editFile) formData.append('image_file', editFile);

      const res = await api.put(`/items/${editItemId}`, formData, token, true);
      addToast(res.message, 'success');
      setShowEditModal(false);
      await fetchSellerData();
    } catch (err) {
      addToast(err.message || 'Edit failed.', 'danger');
    }
  };

  // Submit Add Listing
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', addName);
      formData.append('price', addPrice);
      formData.append('stock', addStock);
      formData.append('barcode', addBarcode);
      formData.append('category', addCategory);
      formData.append('description', addDescription);
      if (addImageUrl) formData.append('cloudinary_url', addImageUrl);
      if (addFile) formData.append('user_file', addFile);

      const res = await api.post('/items', formData, token, true);
      addToast(res.message, 'success');
      
      // Reset form
      setAddName('');
      setAddPrice('');
      setAddStock('');
      setAddBarcode('');
      setAddCategory('');
      setAddDescription('');
      setAddImageUrl('');
      setAddFile(null);
      
      setActiveTab('inventory');
      await fetchSellerData();
    } catch (err) {
      addToast(err.message || 'Failed to add item.', 'danger');
    }
  };

  // Submit Bulk Upload
  const handleCsvSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const res = await api.post('/items/csv-upload', formData, token, true);
      setUploadResult(res);
      addToast(res.message, res.errorsCount > 0 ? 'warning' : 'success');
      if (res.successCount > 0) {
        setCsvFile(null);
        await fetchSellerData();
      }
    } catch (err) {
      addToast(err.message || 'CSV Bulk upload failed.', 'danger');
      setUploadResult({ message: err.message, successCount: 0, errorsCount: 1, errors: [err.message] });
    }
  };

  // Process order updates (Accepted, Rejected, Shipped, Delivered, Cancelled)
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const res = await api.put(`/orders/status/${orderId}`, { status: newStatus }, token);
      addToast(res.message, 'success');
      await fetchSellerData();
    } catch (err) {
      addToast(err.message || 'Status update failed.', 'danger');
    }
  };

  // Respond to buyer's cancellation request
  const handleCancelResponse = async (orderId, action) => {
    const confirmMsg = action === 'accept'
      ? 'Accept this cancellation? The buyer will be refunded immediately.'
      : 'Reject this cancellation request? The order will continue as normal.';
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await api.post(`/orders/cancel-response/${orderId}`, { action }, token);
      addToast(res.message, 'success');
      await fetchSellerData();
    } catch (err) {
      addToast(err.message || 'Failed to process cancellation response.', 'danger');
    }
  };

  // Respond to buyer's return request
  const handleReturnResponse = async (orderId, action) => {
    const confirmMsg = action === 'accept'
      ? 'Accept this return? Stock will be restored and the buyer refunded immediately.'
      : 'Reject this return request? The order will remain as Delivered.';
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await api.post(`/orders/return-response/${orderId}`, { action }, token);
      addToast(res.message, 'success');
      await fetchSellerData();
    } catch (err) {
      addToast(err.message || 'Failed to process return response.', 'danger');
    }
  };


  const handleDownloadTemplate = () => {
    // Point directly to backend CSV template route
    window.open('/api/items/csv-template', '_blank');
  };

  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Inventory & Sales</h1>
        <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Manage your active listings and fulfill pending orders.</p>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap justify-center border-b border-white/5 mb-8 gap-2">
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'inventory' ? 'border-yellow-500 text-white' : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          Active Inventory
        </button>
        
        <button 
          onClick={() => setActiveTab('sales')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'sales' ? 'border-yellow-500 text-white' : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          Sales & Fulfillment
        </button>

        <button 
          onClick={() => setActiveTab('add')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'add' ? 'border-yellow-500 text-white' : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          List New Asset
        </button>

        <button 
          onClick={() => setActiveTab('bulk')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'bulk' ? 'border-yellow-500 text-white' : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          Bulk Upload (CSV)
        </button>
      </div>

      {/* Active Inventory tab */}
      {activeTab === 'inventory' && (
        <div>
          {loading ? (
            <p className="text-center text-gray-500">Loading listings...</p>
          ) : myItems.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/5">
              <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">No active listings found.</p>
            </div>
          ) : (
            <div>
              {/* Search Bar */}
              <div className="flex items-center gap-3 bg-[#121418] border border-[#2A2F36] rounded-xl px-4 py-3 mb-6 w-full max-w-md mx-auto">
                <Search size={16} className="text-gray-500" />
                <input 
                  type="text"
                  placeholder="Search listings by name or barcode..."
                  className="bg-transparent border-none text-white text-sm focus:outline-none w-full"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {paginatedItems.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/5">
                  <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">No matching listings found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-white/5 border border-white/5 shadow-2xl mb-8">
                  {paginatedItems.map((item) => (
                    <div key={item._id} className="group relative bg-[#16191D] p-4 flex flex-col transition-all duration-300">
                      <div className="aspect-square bg-[#1C2025] mb-4 overflow-hidden relative">
                        <img 
                          src={item.user_file} 
                          alt={item.name}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600'; }}
                        />
                      </div>
                      
                      <h3 className="text-xs font-black text-white uppercase tracking-tight truncate mb-1">{item.name}</h3>
                      
                      <div className="mt-auto pt-2 flex justify-between items-center border-t border-white/5">
                        <span className="text-[10px] font-bold text-green-400">₹{item.price.toFixed(2)}</span>
                        <span className="text-[10px] font-bold text-gray-600">Stock: {item.stock}</span>
                      </div>

                      <button 
                        onClick={() => triggerEdit(item)}
                        className="w-full mt-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9px] font-black uppercase tracking-wider text-center transition-all active:scale-95 shadow"
                      >
                        Edit Listing
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6 mb-4">
                  <button
                    onClick={() => {
                      setCurrentPage(p => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={18} className="text-white" />
                  </button>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Page <span className="text-white">{currentPage}</span> of {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      setCurrentPage(p => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={18} className="text-white" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sales & Fulfillment tab */}
      {activeTab === 'sales' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3">
              <RefreshCw size={18} className="text-gray-600 animate-spin" />
              <p className="text-gray-500 text-sm">Loading orders...</p>
            </div>
          ) : sellerOrders.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl">
              <Package size={36} className="mx-auto mb-4 text-gray-700" />
              <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">No orders received yet.</p>
              <p className="text-gray-700 text-[10px] mt-2">When customers buy your products, full order details will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Total Orders', value: sellerOrders.length, color: 'text-white' },
                  { label: 'Pending', value: sellerOrders.filter(o => ['Ordered','Accepted'].includes(o.status)).length, color: 'text-yellow-400' },
                  { label: 'Cancelled/Refunded', value: sellerOrders.filter(o => ['Cancelled','Rejected'].includes(o.status)).length, color: 'text-red-400' },
                  { label: 'Total Earned', value: `₹${sellerOrders.filter(o => !['Cancelled','Rejected'].includes(o.status)).reduce((s,o) => s + (o.myEarnings||0), 0).toFixed(2)}`, color: 'text-green-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[#16191D] border border-white/5 rounded-2xl p-4 text-center">
                    <p className={`text-xl font-black ${color}`}>{value}</p>
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {sellerOrders.map((order) => {
                const isExpanded = expandedOrder === order._id;
                const isCancelReq = order.status === 'CancellationRequested';
                const isReturnReq = order.status === 'ReturnRequested';
                const isActionRequired = isCancelReq || isReturnReq;
                const isClosed = ['Cancelled','Rejected','Delivered','Returned'].includes(order.status);

                const statusColors = {
                  Ordered:               'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  Accepted:              'bg-green-500/10 text-green-400 border-green-500/20',
                  Shipped:               'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  Delivered:             'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  Rejected:              'bg-red-500/10 text-red-400 border-red-500/20',
                  Cancelled:             'bg-red-500/10 text-red-400 border-red-500/20',
                  CancellationRequested: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  ReturnRequested:       'bg-orange-500/10 text-orange-400 border-orange-500/20',
                  Returned:              'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                };

                return (
                  <div
                    key={order._id}
                    className={`rounded-2xl border overflow-hidden transition-all ${
                      isReturnReq
                        ? 'border-orange-500/30 shadow-orange-500/10 shadow-lg'
                        : isCancelReq
                        ? 'border-amber-500/30 shadow-amber-500/10 shadow-lg'
                        : isClosed
                        ? 'border-white/5 opacity-80'
                        : 'border-white/10'
                    }`}
                  >
                    {/* ── Order Header ── */}
                    <div
                      className={`p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer transition-colors ${
                        isReturnReq ? 'bg-orange-500/5' : isCancelReq ? 'bg-amber-500/5' : 'bg-[#16191D] hover:bg-white/[0.02]'
                      }`}
                      onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex flex-col">
                          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Order</p>
                          <p className="text-sm font-black text-white">#LC-{String(order._id).slice(-8).toUpperCase()}</p>
                        </div>
                        <div className="w-px h-8 bg-white/5" />
                        <div>
                          <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Buyer</p>
                          <p className="text-sm font-bold text-blue-400">{order.user?.username || '—'}</p>
                        </div>
                        <div className="w-px h-8 bg-white/5 hidden md:block" />
                        <div className="hidden md:block">
                          <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Date</p>
                          <p className="text-xs text-gray-300">{new Date(order.date_ordered).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>
                        </div>
                        <div className="w-px h-8 bg-white/5 hidden md:block" />
                        <div className="hidden md:block">
                          <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">My Earnings</p>
                          <p className={`text-sm font-black ${isClosed ? 'text-red-400 line-through' : 'text-green-400'}`}>
                            ₹{(order.myEarnings || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isActionRequired && (
                          <span className={`text-[9px] font-black uppercase tracking-widest animate-pulse ${
                            isReturnReq ? 'text-orange-400' : 'text-amber-400'
                          }`}>⚠️ Action Required</span>
                        )}
                        <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border rounded-full ${statusColors[order.status] || 'bg-white/5 text-white border-white/10'}`}>
                          {order.status === 'CancellationRequested' ? 'Cancel Requested' :
                           order.status === 'ReturnRequested' ? 'Return Requested' : order.status}
                        </span>
                        {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                      </div>
                    </div>

                    {/* ── Expanded Details ── */}
                    {isExpanded && (
                      <div className="border-t border-white/5 bg-[#13161A]">

                        {/* Return Request Alert Banner */}
                        {isReturnReq && (
                          <div className="px-6 py-4 bg-orange-500/8 border-b border-orange-500/20 flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-black text-orange-400">🔄 Buyer Requested a Return</p>
                              <p className="text-[10px] text-orange-300/60 mt-1">
                                Reason: "{order.return_reason || 'No reason given'}"
                              </p>
                              <p className="text-[10px] text-orange-300/40 mt-0.5">
                                If you accept, ₹{order.total_price?.toFixed(2)} will be refunded and stock restored.
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleReturnResponse(order._id, 'accept')}
                                className="px-6 py-2.5 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all shadow-lg"
                              >
                                ✅ Accept Return
                              </button>
                              <button
                                onClick={() => handleReturnResponse(order._id, 'reject')}
                                className="px-6 py-2.5 bg-black border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/10 transition-all"
                              >
                                ❌ Reject
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Cancellation Alert Banner */}
                        {isCancelReq && (
                          <div className="px-6 py-4 bg-amber-500/8 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-black text-amber-400">⚠️ Buyer Requested Cancellation</p>
                              <p className="text-[10px] text-amber-300/60 mt-1">If you accept, ₹{order.total_price?.toFixed(2)} will be refunded to the buyer immediately.</p>
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleCancelResponse(order._id, 'accept')}
                                className="px-6 py-2.5 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all shadow-lg"
                              >
                                ✅ Accept & Refund
                              </button>
                              <button
                                onClick={() => handleCancelResponse(order._id, 'reject')}
                                className="px-6 py-2.5 bg-black border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/10 transition-all"
                              >
                                ❌ Reject
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Refund Banner */}
                        {(order.status === 'Cancelled' || order.status === 'Rejected') && (
                          <div className="px-6 py-3 bg-red-500/5 border-b border-red-500/10 flex items-center gap-3">
                            <XCircle size={16} className="text-red-400 flex-shrink-0" />
                            <p className="text-xs text-red-300">
                              This order was <strong>{order.status.toLowerCase()}</strong>. 
                              ₹{(order.myEarnings || 0).toFixed(2)} was deducted from your earnings and refunded to the buyer.
                            </p>
                          </div>
                        )}

                        <div className="grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/5">

                          {/* ── My Items in this Order ── */}
                          <div className="p-5 md:col-span-1">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">My Products in Order</p>
                            <div className="space-y-3">
                              {(order.myItems || []).map((oi, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-[#1C2025] rounded-xl overflow-hidden flex-shrink-0 p-0.5">
                                    <img
                                      src={oi.item?.user_file}
                                      alt={oi.item?.name}
                                      className="w-full h-full object-cover rounded-lg"
                                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600'; }}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{oi.item?.name}</p>
                                    <p className="text-[10px] text-gray-500">Qty: {oi.quantity} × ₹{oi.price?.toFixed(2)}</p>
                                  </div>
                                  <p className="text-xs font-black text-green-400 flex-shrink-0">₹{(oi.price * oi.quantity).toFixed(2)}</p>
                                </div>
                              ))}
                              <div className="border-t border-white/5 pt-2 flex justify-between">
                                <span className="text-[9px] font-bold text-gray-500 uppercase">My Total</span>
                                <span className="text-sm font-black text-green-400">₹{(order.myEarnings || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {/* ── Buyer Info ── */}
                          <div className="p-5 md:col-span-1">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Buyer Details</p>
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2.5">
                                <User size={13} className="text-gray-600 flex-shrink-0" />
                                <span className="text-xs text-gray-300">{order.user?.full_name || order.user?.username}</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <Mail size={13} className="text-gray-600 flex-shrink-0" />
                                <span className="text-xs text-gray-400">{order.user?.email_address || '—'}</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <Phone size={13} className="text-gray-600 flex-shrink-0" />
                                <span className="text-xs text-gray-400">{order.user?.phone_number || '—'}</span>
                              </div>
                              {order.address && (
                                <div className="flex items-start gap-2.5 mt-2 pt-2 border-t border-white/5">
                                  <MapPin size={13} className="text-gray-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Delivery Address</p>
                                    <p className="text-xs text-gray-300">
                                      {order.address.street || order.address.address_line},<br />
                                      {order.address.city}, {order.address.state} — {order.address.zip_code || order.address.postal_code}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── Actions & Timeline ── */}
                          <div className="p-5 md:col-span-1 flex flex-col gap-4">
                            <div>
                              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Order Timeline</p>
                              <div className="space-y-2">
                                {['Ordered', 'Accepted', 'Shipped', 'Delivered'].map((step, idx) => {
                                  const statusOrder = ['Ordered','Accepted','Shipped','Delivered'];
                                  const currentIdx = statusOrder.indexOf(order.status);
                                  const done = idx <= currentIdx && !['Cancelled','Rejected','CancellationRequested'].includes(order.status);
                                  return (
                                    <div key={step} className="flex items-center gap-2.5">
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-blue-500 border-blue-400' : 'bg-transparent border-white/10'}`}>
                                        {done && <CheckCircle size={10} className="text-white" />}
                                      </div>
                                      <span className={`text-[10px] font-bold uppercase tracking-widest ${done ? 'text-white' : 'text-gray-600'}`}>{step}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            {!isCancelReq && (
                              <div className="flex flex-col gap-2 mt-auto">
                                {order.status === 'Ordered' && (
                                  <>
                                    <button
                                      onClick={() => handleStatusUpdate(order._id, 'Accepted')}
                                      className="w-full py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-400 transition-all"
                                    >
                                      ✓ Accept Order
                                    </button>
                                    <button
                                      onClick={() => handleStatusUpdate(order._id, 'Rejected')}
                                      className="w-full py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all"
                                    >
                                      ✗ Reject Order
                                    </button>
                                  </>
                                )}
                                {order.status === 'Accepted' && (
                                  <button
                                    onClick={() => handleStatusUpdate(order._id, 'Shipped')}
                                    className="w-full py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
                                  >
                                    <Truck size={12} /> Mark Shipped
                                  </button>
                                )}
                                {order.status === 'Shipped' && (
                                  <button
                                    onClick={() => handleStatusUpdate(order._id, 'Delivered')}
                                    className="w-full py-2.5 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-500 transition-all flex items-center justify-center gap-2"
                                  >
                                    <CheckCircle size={12} /> Mark Delivered
                                  </button>
                                )}
                                {['Cancelled','Rejected','Delivered'].includes(order.status) && (
                                  <div className={`text-center py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${order.status === 'Delivered' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {order.status === 'Delivered' ? '✓ Order Completed' : `✗ Order ${order.status}`}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* List New Asset tab */}
      {activeTab === 'add' && (
        <div className="max-w-lg mx-auto bg-[#16191D] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
          <h2 className="text-xl font-black text-white uppercase tracking-wider mb-6">List a New Item</h2>
          
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Item Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-[#121418] border border-[#2A2F36] rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all" 
                placeholder="RTX 4090"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Price (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full px-4 py-3 bg-[#121418] border border-[#2A2F36] rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all" 
                  placeholder="1599.99"
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Stock Qty</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 bg-[#121418] border border-[#2A2F36] rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all" 
                  placeholder="50"
                  value={addStock}
                  onChange={(e) => setAddStock(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Barcode</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-[#121418] border border-[#2A2F36] rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all" 
                  placeholder="12-digit barcode"
                  value={addBarcode}
                  onChange={(e) => setAddBarcode(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Category</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-[#121418] border border-[#2A2F36] rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all" 
                  placeholder="Electronics"
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Description</label>
              <textarea 
                className="w-full px-4 py-3 bg-[#121418] border border-[#2A2F36] rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all resize-none" 
                rows="3"
                placeholder="Product description..."
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Product Image URL (Optional)</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-[#121418] border border-[#2A2F36] rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all" 
                placeholder="https://res.cloudinary.com/..."
                value={addImageUrl}
                onChange={(e) => setAddImageUrl(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Or Upload Image File</label>
              <input 
                type="file" 
                onChange={(e) => setAddFile(e.target.files[0])}
                className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/5 file:text-gray-300 hover:file:bg-white/10 cursor-pointer w-full"
              />
            </div>

            <button 
              type="submit" 
              className="w-full flex items-center justify-center py-4 bg-white text-black hover:bg-gray-200 font-black rounded-xl shadow-lg transition-all active:scale-[0.97] gap-2 mt-4"
            >
              <PlusCircle size={18} />
              Add Item to Market
            </button>
          </form>
        </div>
      )}


      {/* Bulk CSV Upload tab */}
      {activeTab === 'bulk' && (
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Bulk CSV Upload</h2>
            <p className="text-xs text-gray-500 mt-1">Upload multiple products at once using the template below</p>
          </div>

          {/* Column Reference Table */}
          <div className="bg-[#16191D] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CSV Column Reference</p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all active:scale-95"
              >
                <Download size={10} />
                Download Template
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Column', 'Required', 'Example', 'Notes'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[9px] font-black text-gray-600 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {[
                    { col: 'Name', req: true,  ex: 'iPhone 15 Pro Max',      note: 'Must be unique in the market' },
                    { col: 'Barcode', req: true, ex: '888888888801',           note: '12-digit UPC/EAN, must be unique' },
                    { col: 'Price',   req: true, ex: '129999.00',              note: 'Decimal number in INR (₹)' },
                    { col: 'Stock',   req: true, ex: '10',                     note: 'Integer quantity available' },
                    { col: 'Category', req: false, ex: 'Electronics',          note: 'Defaults to "General" if empty' },
                    { col: 'Description', req: false, ex: 'Apple A17 chip...', note: 'Product details for item page' },
                    { col: 'Image URL', req: false, ex: 'https://...',         note: 'Cloudinary or Unsplash URL' },
                  ].map(({ col, req, ex, note }) => (
                    <tr key={col} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 text-xs font-black text-white">{col}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          req ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                        }`}>{req ? 'Required' : 'Optional'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-500 font-mono">{ex}</td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-600">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <form onSubmit={handleCsvSubmit}>
            <label
              htmlFor="csv-file-input"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                setUploadResult(null);
                const file = e.dataTransfer.files[0];
                if (file && file.name.endsWith('.csv')) setCsvFile(file);
                else addToast('Please drop a valid .csv file', 'warning');
              }}
              className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-white/40 bg-white/5'
                  : csvFile
                  ? 'border-green-500/40 bg-green-500/5'
                  : 'border-white/10 bg-[#16191D] hover:border-white/20 hover:bg-white/[0.02]'
              }`}
            >
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { setCsvFile(e.target.files[0]); setUploadResult(null); }}
              />
              {csvFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <CheckCircle size={20} className="text-green-400" />
                  </div>
                  <p className="text-sm font-black text-white">{csvFile.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    {(csvFile.size / 1024).toFixed(1)} KB · Ready to upload
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setCsvFile(null); setUploadResult(null); }}
                    className="text-[9px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest mt-1"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                    <Upload size={22} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">Drop your CSV here</p>
                    <p className="text-[10px] text-gray-600 mt-1">or click to browse files</p>
                  </div>
                  <p className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">Only .csv files are accepted</p>
                </div>
              )}
            </label>

            {csvFile && (
              <button
                type="submit"
                className="w-full mt-4 py-4 bg-white text-black font-black rounded-xl hover:bg-gray-100 transition-all active:scale-[0.98] text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
              >
                <FileSpreadsheet size={16} />
                Process {csvFile.name}
              </button>
            )}
          </form>

          {/* Upload Result Summary */}
          {uploadResult && (
            <div className={`rounded-2xl border p-5 ${
              uploadResult.errorsCount > 0
                ? 'border-yellow-500/20 bg-yellow-500/5'
                : 'border-green-500/20 bg-green-500/5'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                {uploadResult.successCount > 0
                  ? <CheckCircle size={18} className="text-green-400" />
                  : <XCircle size={18} className="text-red-400" />
                }
                <p className="text-sm font-black text-white">{uploadResult.message}</p>
              </div>

              <div className="flex gap-4 mb-3">
                <div className="flex-1 bg-black/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-green-400">{uploadResult.successCount}</p>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Items Imported</p>
                </div>
                <div className="flex-1 bg-black/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-red-400">{uploadResult.errorsCount}</p>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Rows Skipped</p>
                </div>
              </div>

              {uploadResult.errors?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Error Details:</p>
                  {uploadResult.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
                      <XCircle size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-300 font-medium">{err}</p>
                    </div>
                  ))}
                </div>
              )}

              {uploadResult.successCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setActiveTab('inventory'); setUploadResult(null); }}
                  className="w-full mt-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  View Inventory →
                </button>
              )}
            </div>
          )}

        </div>
      )}


      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-box bg-[#16191D] border border-white/10 p-8 shadow-2xl rounded-[2rem]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white uppercase tracking-wider">Edit Product Listing</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Product Name</p>
                <p className="text-white font-black uppercase tracking-tight text-sm">{editItemName}</p>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Price (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  required 
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Stock Quantity</label>
                <input 
                  type="number" 
                  className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  required 
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Product Image URL (Cloudinary or Web URL)</label>
                <input 
                  type="text" 
                  className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/..."
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Or Upload New Image</label>
                <input 
                  type="file" 
                  onChange={(e) => setEditFile(e.target.files[0])}
                  className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/5 file:text-gray-300 hover:file:bg-white/10 cursor-pointer w-full"
                />
              </div>
              
              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-4 bg-transparent border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 transition-all text-sm uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all text-sm uppercase tracking-wider shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerPanel;
