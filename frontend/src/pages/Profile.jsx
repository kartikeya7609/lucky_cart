import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Bell, Trash2, Plus, MapPin, Award, LogOut, Check, ShoppingBag, Heart, ShieldAlert, Star } from 'lucide-react';

const Profile = () => {
  const { token, user, addToast, logout } = useAuth();
  const navigate = useNavigate();

  // Dashboard states
  const [stats, setStats] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal display states
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Address Form States
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Edit Profile States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zip_code: user.zip_code || ''
      });
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      const data = await api.get('/orders/profile-dashboard', token);
      setStats(data);
      
      const addrData = await api.get('/addresses', token);
      setAddresses(addrData);
    } catch (err) {
      console.error("Error loading profile stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const handleSetDefaultAddress = async (id) => {
    try {
      const res = await api.put(`/addresses/default/${id}`, {}, token);
      addToast(res.message, 'success');
      await fetchDashboardData();
    } catch (err) {
      addToast(err.message || 'Failed to update default address', 'danger');
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      const res = await api.delete(`/addresses/${id}`, token);
      addToast(res.message, 'success');
      await fetchDashboardData();
    } catch (err) {
      addToast(err.message || 'Failed to delete address', 'danger');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/addresses', {
        full_name: fullName,
        phone_number: phoneNumber,
        address_line: addressLine,
        city,
        state,
        zip_code: zipCode,
        is_default: isDefault
      }, token);

      addToast(res.message, 'success');
      
      // Reset form fields
      setFullName('');
      setPhoneNumber('');
      setAddressLine('');
      setCity('');
      setState('');
      setZipCode('');
      setIsDefault(false);
      
      setShowAddressModal(false);
      await fetchDashboardData();
    } catch (err) {
      addToast(err.message || 'Failed to save address', 'danger');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await api.put('/auth/me', editForm, token);
      addToast(res.message || 'Profile updated successfully', 'success');
      setShowEditProfileModal(false);
      // We force a page reload to update the context, or we could update the AuthContext state directly if the context exposes an update method.
      // For simplicity, reload to fetch updated user details.
      window.location.reload();
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'danger');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSignOut = () => {
    logout();
    addToast('Logged out successfully', 'success');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  // Set default profile avatar URL
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'User'}`;

  return (
    <div className="min-h-screen bg-[#0F1115] text-white overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        
        {/* Profile Header (Instagram style) */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-16 mb-12">
          {/* Avatar Ring */}
          <div className="relative group">
            <div className="w-28 h-28 md:w-44 md:h-44 rounded-full p-1 bg-gradient-to-tr from-green-400 via-blue-500 to-purple-600">
              <div className="w-full h-full rounded-full bg-[#0F1115] p-1">
                <img 
                  src={avatarUrl} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover"
                />
                {stats?.unreadNotifCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-2 border-[#0F1115] flex items-center justify-center text-[10px] font-black animate-pulse">
                    {stats.unreadNotifCount}
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-full border-2 md:border-4 border-[#0F1115] flex items-center justify-center">
              <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L9 10.586l3.293-3.293a1 1 0 111.414 1.414z"/>
              </svg>
            </div>
          </div>

          {/* Profile Details */}
          <div className="flex-grow text-center md:text-left w-full">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter">{user?.username}</h2>
              <div className="flex gap-2 justify-center md:justify-start">
                <button 
                  onClick={() => setShowEditProfileModal(true)}
                  className="flex-grow md:flex-grow-0 px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 shadow-lg"
                >
                  Edit Profile
                </button>
                <button 
                  onClick={() => setShowNotifModal(true)} 
                  className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 text-gray-300 hover:text-white"
                >
                  <Bell size={16} />
                </button>
              </div>
            </div>

            {/* Stats list */}
            <div className="flex items-center justify-around md:justify-start gap-4 md:gap-12 py-4 border-y border-white/5 md:border-none">
              <div onClick={() => navigate('/orders')} className="text-center md:text-left group/stat cursor-pointer">
                <span className="block text-lg md:text-xl font-black group-hover:text-blue-400 transition-colors">{stats?.orderCount || 0}</span>
                <span className="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest">Orders</span>
              </div>
              <div onClick={() => navigate('/wishlist')} className="text-center md:text-left group/stat cursor-pointer">
                <span className="block text-lg md:text-xl font-black group-hover:text-red-400 transition-colors">{stats?.wishlistCount || 0}</span>
                <span className="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest">Wishlist</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-lg md:text-xl font-black text-green-400">{stats?.loyaltyPoints || 0}</span>
                <span className="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest">Points</span>
              </div>
            </div>

            <div className="mt-6 hidden md:block">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider leading-relaxed">
                {user?.full_name || 'Lucky Member'} • {user?.role === 'consumer' ? 'Consumer' : 'Seller'}<br />
                <span className="text-[9px] text-gray-600 uppercase">{user?.email_address}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Personal Details Grid (Registration Fields) */}
        <div className="bg-[#16191D] border border-white/5 p-6 md:p-8 rounded-2xl mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Account Information</h3>
            <span className="px-3 py-1 bg-white/5 rounded-full text-[8px] font-black uppercase tracking-widest text-blue-400">
              {user?.role} Account
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Full Name</p>
              <p className="text-sm font-black text-white">{user?.full_name || 'Not Provided'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Email Address</p>
              <p className="text-sm font-black text-white">{user?.email_address || 'Not Provided'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Phone Number</p>
              <p className="text-sm font-black text-white">{user?.phone_number || 'Not Provided'}</p>
            </div>
            <div className="space-y-1 md:col-span-3 border-t border-white/5 pt-6 mt-2">
              <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-2">Registered Address</p>
              <p className="text-sm font-black text-white leading-relaxed">
                {user?.address ? (
                  <>
                    {user.address}<br />
                    {user.city}, {user.state} {user.zip_code}
                  </>
                ) : 'No address provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12">
          
          {/* Loyalty Level Progress */}
          <div className="bg-[#16191D] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Loyalty Tier</h3>
            <div className="flex items-end justify-between mb-4">
              <span className="text-2xl font-black tracking-tighter uppercase">Gold</span>
              <span className="text-xs font-bold text-green-400">{stats?.loyaltyPoints || 0}/1000</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-400 rounded-full transition-all duration-1000" 
                style={{ width: `${stats?.loyaltyProgress || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Spending Analytics (Horizontal bars matching template layout) */}
          <div className="bg-[#16191D] border border-white/5 p-6 rounded-2xl group">
            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4">Analytics</h3>
            <div className="flex items-end gap-2 h-16 mb-4">
              {(stats?.analytics?.barHeights || []).map((height, index) => (
                <div 
                  key={index} 
                  className="flex-grow bg-white/5 rounded-t-sm hover:bg-blue-400 transition-all cursor-help relative group/bar" 
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white text-black text-[8px] font-black rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20">
                    ₹{stats.analytics.monthlySpend[index]?.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
              <span>Spent</span>
              <span className="text-white">₹{stats?.totalSpent?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          {/* Achievements badge grid */}
          <div className="bg-[#16191D] border border-white/5 p-6 rounded-2xl sm:col-span-2 lg:col-span-1">
            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4">Achievements</h3>
            <div className="flex flex-wrap gap-3">
              {(stats?.badges || []).map((badge, idx) => (
                <div key={idx} className="group/badge relative cursor-help" title={`${badge.name}: ${badge.desc}`}>
                  <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-xl hover:bg-white/10 transition-all active:scale-90">
                    {badge.icon}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Navigation Action Buttons Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-12">
          <button 
            onClick={() => navigate('/orders')} 
            className="group bg-[#16191D] border border-white/5 p-5 md:p-6 hover:bg-white/5 transition-all text-left active:scale-[0.98]"
          >
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShoppingBag size={20} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Orders</h4>
          </button>

          <button 
            onClick={() => navigate('/wishlist')} 
            className="group bg-[#16191D] border border-white/5 p-5 md:p-6 hover:bg-white/5 transition-all text-left active:scale-[0.98]"
          >
            <div className="w-10 h-10 bg-red-500/10 text-red-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Heart size={20} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Wishlist</h4>
          </button>

          <button 
            onClick={() => setShowAddressModal(true)} 
            className="group bg-[#16191D] border border-white/5 p-5 md:p-6 text-left hover:bg-white/5 transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MapPin size={20} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Addresses</h4>
          </button>

          <button 
            onClick={() => setShowNotifModal(true)} 
            className="group bg-[#16191D] border border-white/5 p-5 md:p-6 text-left hover:bg-white/5 transition-all active:scale-[0.98] relative"
          >
            <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bell size={20} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Alerts</h4>
            {stats?.unreadNotifCount > 0 && (
              <span className="absolute top-4 right-4 w-2 h-2 bg-purple-500 rounded-full"></span>
            )}
          </button>

          <button 
            onClick={handleSignOut} 
            className="group col-span-2 bg-[#16191D] border border-white/5 p-5 md:p-6 hover:bg-red-500/10 transition-all flex items-center gap-6 active:scale-[0.99] text-left"
          >
            <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
              <LogOut size={20} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500">Sign Out</h4>
          </button>

          <div className="col-span-2 bg-gradient-to-r from-blue-600 to-indigo-700 p-5 md:p-6 rounded-lg flex items-center justify-between">
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-white mb-1">Lucky Plus</h4>
              <p className="text-[8px] text-white/70 uppercase font-bold tracking-widest">Premium Membership</p>
            </div>
            <button 
              onClick={() => addToast('Lucky Plus is currently invite-only!', 'info')}
              className="px-4 py-2 bg-white text-black text-[8px] font-black uppercase tracking-widest rounded-full hover:bg-slate-200 transition-colors"
            >
              Explore
            </button>
          </div>
        </div>

        {/* Recently Viewed Grid */}
        <div className="border-t border-white/5 pt-12 pb-24">
          <div className="flex items-center justify-between mb-8 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Recently Viewed</h3>
            <button 
              onClick={() => navigate('/market')} 
              className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 transition-colors"
            >
              Shop All
            </button>
          </div>

          {(!stats?.recentlyViewed || stats.recentlyViewed.length === 0) ? (
            <p className="text-[10px] text-gray-600 uppercase font-bold text-center py-6">No items viewed recently.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-2">
              {stats.recentlyViewed.map((item) => (
                <div 
                  key={item._id}
                  onClick={() => navigate(`/item/${item._id}`)} 
                  className="aspect-square relative group overflow-hidden bg-[#16191D] rounded-sm cursor-pointer"
                >
                  <img 
                    src={item.user_file} 
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600'; }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ADDRESSES MODAL */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#16191D] border border-white/10 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl">
            <div className="sticky top-0 bg-[#16191D] p-6 border-b border-white/5 flex items-center justify-between z-10">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Manage Addresses</h3>
              <button 
                onClick={() => setShowAddressModal(false)} 
                className="text-gray-500 hover:text-white transition-colors text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* List Current Addresses */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Your Locations</h4>
                {addresses.length === 0 ? (
                  <p className="text-[10px] text-gray-700 uppercase font-black text-center py-4">No addresses saved.</p>
                ) : (
                  addresses.map((addr) => (
                    <div key={addr._id} className="p-4 bg-white/5 border border-white/5 rounded-lg flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-black uppercase">{addr.full_name}</p>
                          {addr.is_default && (
                            <span className="px-2 py-0.5 bg-blue-500 text-[7px] font-black uppercase tracking-widest text-white rounded-full">Default</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400">{addr.address_line}, {addr.city}, {addr.state} {addr.zip_code}</p>
                        <p className="text-[9px] text-gray-600 font-bold">Phone: {addr.phone_number}</p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <button 
                          onClick={() => handleDeleteAddress(addr._id)}
                          className="text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                        {!addr.is_default && (
                          <button 
                            onClick={() => handleSetDefaultAddress(addr._id)}
                            className="text-[8px] font-black uppercase text-gray-500 hover:text-blue-400 transition-colors"
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Address Form */}
              <div className="pt-8 border-t border-white/5">
                <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-6">Add New Address</h4>
                <form onSubmit={handleAddAddress} className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required 
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">Phone</label>
                    <input 
                      type="text" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required 
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">ZIP Code</label>
                    <input 
                      type="text" 
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      required 
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">Street Address</label>
                    <input 
                      type="text" 
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      required 
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">City</label>
                    <input 
                      type="text" 
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required 
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">State</label>
                    <input 
                      type="text" 
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required 
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2 py-4">
                    <input 
                      type="checkbox" 
                      id="is_default_profile"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="rounded border-white/10 bg-white/5 text-blue-500"
                    />
                    <label htmlFor="is_default_profile" className="text-[9px] font-black uppercase text-gray-500 cursor-pointer">
                      Set as default delivery address
                    </label>
                  </div>
                  <button 
                    type="submit" 
                    className="col-span-2 w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 rounded-lg"
                  >
                    Save Address
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION MODAL */}
      {showNotifModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#16191D] border border-white/10 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl rounded-2xl">
            <div className="sticky top-0 bg-[#16191D] p-6 border-b border-white/5 flex items-center justify-between z-10">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Notifications</h3>
              <button 
                onClick={() => setShowNotifModal(false)} 
                className="text-gray-500 hover:text-white transition-colors text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              {(!stats?.notifications || stats.notifications.length === 0) ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell size={20} className="text-gray-500" />
                  </div>
                  <p className="text-[10px] text-gray-500 font-black uppercase">No alerts right now</p>
                </div>
              ) : (
                stats.notifications.map((notif) => (
                  <div 
                    key={notif._id} 
                    className={`p-4 bg-white/5 border-l-2 ${!notif.is_read ? 'border-purple-500 bg-purple-500/5' : 'border-white/10'} rounded-r-lg`}
                  >
                    <p className="text-[11px] text-gray-200 leading-relaxed">{notif.message}</p>
                    <p className="text-[8px] text-gray-600 uppercase font-bold mt-2">
                      {new Date(notif.date_created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.date_created).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#16191D] border border-white/10 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl">
            <div className="sticky top-0 bg-[#16191D] p-6 border-b border-white/5 flex items-center justify-between z-10">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Edit Profile</h3>
              <button 
                onClick={() => setShowEditProfileModal(false)} 
                className="text-gray-500 hover:text-white transition-colors text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleUpdateProfile} className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    required 
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">Phone Number</label>
                  <input 
                    type="tel" 
                    value={editForm.phone_number}
                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                    required 
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">Street Address</label>
                  <input 
                    type="text" 
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    required 
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">City</label>
                  <input 
                    type="text" 
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    required 
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">State</label>
                  <input 
                    type="text" 
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    required 
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">ZIP Code</label>
                  <input 
                    type="text" 
                    value={editForm.zip_code}
                    onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })}
                    required 
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                  />
                </div>
                
                <div className="col-span-2 mt-6">
                  <button 
                    type="submit" 
                    disabled={isUpdatingProfile}
                    className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 rounded-lg disabled:opacity-50"
                  >
                    {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
