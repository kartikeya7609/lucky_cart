import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Trash2, Bookmark, MapPin, Plus, Clock } from 'lucide-react';

const Cart = () => {
  const { token, addToast } = useAuth();
  const { 
    cartItems, 
    subtotal, 
    discount, 
    total, 
    estDelivery, 
    appliedCoupon, 
    removeFromCart, 
    saveForLater, 
    applyCoupon, 
    checkoutCart 
  } = useCart();
  
  const navigate = useNavigate();

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  
  // Address States
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // New Address Form states
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const fetchAddresses = async () => {
    if (!token) return;
    try {
      const data = await api.get('/addresses', token);
      setAddresses(data);
      
      // Pre-select default address
      const defaultAddr = data.find(a => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr._id);
      } else if (data.length > 0) {
        setSelectedAddressId(data[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAddresses();
    }
  }, [token]);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    
    const success = await applyCoupon(couponInput);
    if (success) {
      setCouponInput('');
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
      
      // Clear forms
      setFullName('');
      setPhoneNumber('');
      setAddressLine('');
      setCity('');
      setState('');
      setZipCode('');
      setIsDefault(false);
      
      setShowAddressModal(false);
      await fetchAddresses();
    } catch (err) {
      addToast(err.message || 'Failed to add address', 'danger');
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!selectedAddressId) {
      addToast('Please select or add a shipping address.', 'warning');
      return;
    }

    setCheckingOut(true);
    const res = await checkoutCart(selectedAddressId);
    setCheckingOut(false);

    if (res.success) {
      navigate(`/receipt/${res.orderId}`);
    }
  };

  // Helper to calculate time left on 30 min window
  const getMinutesLeft = (dateAddedStr) => {
    const addedTime = new Date(dateAddedStr);
    const expiryTime = new Date(addedTime.getTime() + 30 * 60 * 1000);
    const now = new Date();
    const diffMs = expiryTime - now;
    const diffMins = Math.max(0, Math.floor(diffMs / 1000 / 60));
    return diffMins;
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#0F1115] px-4 py-12 flex items-center justify-center">
        <div className="text-center py-20 px-8 bg-[#16191D] rounded-[3rem] border border-white/5 max-w-xl w-full shadow-2xl">
          <p className="text-gray-400 text-xl font-medium mb-6">Your cart is feeling light.</p>
          <Link 
            to="/market" 
            className="inline-block px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all active:scale-95 shadow-lg"
          >
            Go Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 md:mb-16 px-2">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase mb-4">Cart Exchange</h1>
          <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">Review Assets • Secure Protocol</p>
          <div className="mt-6 inline-flex items-center gap-3 px-4 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-full">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Protocol expires in 30m</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-6">
            {cartItems.map((cartItem) => {
              const item = cartItem.item || {};
              const minsLeft = getMinutesLeft(cartItem.date_added);
              const isLowStock = item.stock < 5;

              return (
                <div 
                  key={cartItem._id} 
                  className="flex flex-col sm:flex-row items-center gap-6 bg-[#16191D] p-6 rounded-3xl shadow-xl border border-white/5 relative overflow-hidden group"
                >
                  {/* Low Stock Indicator */}
                  {isLowStock && (
                    <div className="absolute top-0 left-0 right-0 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest text-center border-b border-red-500/10 animate-pulse">
                      ⚠️ Only {item.stock} left in stock!
                    </div>
                  )}

                  <div className="w-full sm:w-28 h-28 flex-shrink-0 bg-[#1C2025] rounded-2xl p-1 border border-white/5 flex items-center justify-center">
                    <img 
                      src={item.user_file} 
                      alt={item.name} 
                      className="w-full h-full object-cover rounded-xl mix-blend-lighten"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600'; }}
                    />
                  </div>

                  <div className="flex-grow flex flex-col justify-center w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">{item.name}</h2>
                      <span className="px-2 py-0.5 bg-white/5 text-[8px] text-gray-500 rounded border border-white/10 uppercase font-black tracking-widest">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-lg font-black text-green-400 tracking-tighter">₹{item.price?.toFixed(2)}</p>

                    <div className="mt-4 flex items-center gap-4">
                      <p className="text-gray-400 text-sm">Qty: <span className="text-white font-bold">{cartItem.quantity}</span></p>
                      <button 
                        onClick={() => saveForLater(cartItem._id)}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-400/30 transition-all"
                      >
                        Save for later
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-500 mt-3 flex items-center gap-1">
                      <Clock size={12} />
                      Expires in {minsLeft} mins (Est. Delivery: {estDelivery})
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    <button 
                      onClick={() => removeFromCart(cartItem._id)}
                      className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all border border-red-500/10 group-hover:rotate-12"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar / Checkout */}
          <div className="lg:col-span-1">
            <div className="bg-[#16191D] p-8 rounded-3xl shadow-2xl border border-white/5 sticky top-24 space-y-6">
              
              {/* Shipping Address Selector (Integrated into premium card) */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={12} className="text-amber-500" />
                    Delivery Destination
                  </h4>
                  <button 
                    onClick={() => setShowAddressModal(true)} 
                    className="text-[9px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors"
                  >
                    + Add New
                  </button>
                </div>
                {addresses.length === 0 ? (
                  <p className="text-[10px] text-amber-500 uppercase font-bold tracking-wider">No shipping locations configured.</p>
                ) : (
                  <select 
                    value={selectedAddressId} 
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    {addresses.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.full_name} - {a.address_line}, {a.city} {a.is_default ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <h3 className="text-2xl font-bold text-white tracking-tight border-t border-white/5 pt-4">Order Summary</h3>

              <div className="space-y-4 mb-4">
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-400 text-sm font-bold bg-green-400/5 p-2 rounded-lg border border-green-400/10">
                    <span>Discount {appliedCoupon && `(${appliedCoupon.code})`}</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>Shipping</span>
                  <span class="text-blue-400 font-bold">FREE</span>
                </div>
              </div>

              {/* Coupon Code Input */}
              <form onSubmit={handleApplyCoupon} className="mb-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Coupon Code" 
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-grow bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-600 uppercase"
                  />
                  <button 
                    type="submit" 
                    className="px-4 py-3 bg-white/5 border border-white/10 text-white text-xs font-bold rounded-xl hover:bg-white/10 transition-all"
                  >
                    Apply
                  </button>
                </div>
              </form>

              <div className="border-t border-white/10 pt-6">
                <div className="flex justify-between text-2xl font-bold text-white">
                  <span>Total</span>
                  <span className="text-green-400 tracking-tighter">₹{total.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest text-right">Tax included</p>
              </div>

              <form onSubmit={handleCheckout}>
                <button 
                  type="submit" 
                  disabled={checkingOut} 
                  className="w-full text-center py-5 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-bold hover:from-blue-400 hover:to-indigo-400 transition-all shadow-[0_10px_30px_rgba(59,130,246,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingOut ? 'Completing Transaction...' : 'Complete Purchase'}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-center gap-4">
                <div className="flex -space-x-2">
                  <div className="w-8 h-5 bg-white/5 rounded border border-white/10 flex items-center justify-center text-[8px] font-bold text-gray-500 italic">VISA</div>
                  <div className="w-8 h-5 bg-white/5 rounded border border-white/10 flex items-center justify-center text-[8px] font-bold text-gray-500 italic">MC</div>
                </div>
                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Secure Checkout</span>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* NEW ADDRESS MODAL */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#16191D] border border-white/10 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl">
            <div className="sticky top-0 bg-[#16191D] p-6 border-b border-white/5 flex items-center justify-between z-10">
              <h3 class="text-xs font-black uppercase tracking-[0.3em] text-white">Add Shipping Address</h3>
              <button 
                onClick={() => setShowAddressModal(false)} 
                className="text-gray-500 hover:text-white transition-colors text-2xl"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAddAddress} className="p-6 space-y-4">
              <div>
                <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div>
                <label className="block text-[8px] font-black text-gray-600 uppercase mb-2">Street Address</label>
                <input 
                  type="text" 
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  required 
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-white rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  id="is_default_checkout"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 text-blue-500"
                />
                <label htmlFor="is_default_checkout" className="text-[9px] font-black uppercase text-gray-500 cursor-pointer">
                  Set as default delivery address
                </label>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 rounded-lg"
              >
                Save Address
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
