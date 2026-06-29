import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { api } from '../utils/api';
import { Heart, Globe, Lock, Share2, ShoppingCart, Trash2 } from 'lucide-react';

const Wishlist = () => {
  const { token, user, addToast } = useAuth();
  const { refreshCart } = useCart();

  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.get('/wishlist', token);
      setWishlist(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [token]);

  const togglePrivacy = async () => {
    try {
      const res = await api.post('/wishlist/toggle-privacy', {}, token);
      addToast(res.message, 'success');
      await fetchWishlist();
    } catch (err) {
      addToast(err.message || 'Failed to toggle privacy', 'danger');
    }
  };

  const handleRemove = async (wishlistItemId) => {
    try {
      const res = await api.delete(`/wishlist/${wishlistItemId}`, token);
      addToast(res.message, 'success');
      await fetchWishlist();
    } catch (err) {
      addToast(err.message || 'Failed to remove item', 'danger');
    }
  };

  const handleMoveToCart = async (wishlistItemId) => {
    try {
      const res = await api.post(`/wishlist/move-to-cart/${wishlistItemId}`, {}, token);
      addToast(res.message, 'success');
      await fetchWishlist();
      // Also refresh global cart context
      await refreshCart();
    } catch (err) {
      addToast(err.message || 'Failed to move item to cart', 'danger');
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/wishlist/public/${user.username}`;
    navigator.clipboard.writeText(url);
    addToast('Public share link copied to clipboard!', 'success');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '10rem 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading wishlist items...</p>
      </div>
    );
  }

  const items = wishlist?.items || [];
  const isPublic = wishlist?.is_public || false;

  return (
    <div className="min-h-screen bg-[#0F1115] px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase">
            Your Wishlist
          </h1>
          <p className="mt-4 text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">
            Saved for Later
          </p>
          
          <div className="mt-6 flex flex-wrap justify-center items-center gap-4">
            <span className={`text-sm font-medium flex items-center gap-1.5 ${isPublic ? 'text-green-400' : 'text-gray-500'}`}>
              {isPublic ? <Globe size={16} /> : <Lock size={16} />}
              Status: {isPublic ? 'Public' : 'Private'}
            </span>
            
            <button 
              onClick={togglePrivacy}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 text-white transition-all"
            >
              Switch to {isPublic ? 'Private' : 'Public'}
            </button>

            {isPublic && (
              <button 
                onClick={copyShareLink}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] text-blue-400 font-bold uppercase hover:bg-blue-500/20 transition-all"
              >
                <Share2 size={12} />
                Copy Link
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-[#16191D] rounded-[3rem] border border-white/5">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={40} className="text-gray-600" />
            </div>
            <p className="text-gray-400 text-xl font-medium">Your wishlist is currently empty.</p>
            <Link to="/market" className="inline-block mt-8 px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all shadow-xl active:scale-95">
              Explore the Market
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((wishlist_item) => {
              const item = wishlist_item.item;
              if (!item) return null;
              return (
                <div key={wishlist_item._id} className="bg-[#16191D] p-6 rounded-3xl shadow-xl border border-white/5 flex flex-col hover:border-white/10 transition-all group">
                  <div className="relative bg-[#1C2025] rounded-2xl p-4 border border-white/5 mb-6 overflow-hidden">
                    <img 
                      src={item.user_file} 
                      alt={item.name} 
                      className="w-full h-48 object-cover rounded-xl shadow-lg mix-blend-lighten group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600'; }}
                    />
                    <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{item.category}</span>
                    </div>
                  </div>

                  <div className="flex-grow">
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">{item.name}</h2>
                    <p className="text-lg md:text-xl font-black text-green-400 mt-1 tracking-tighter">₹{item.price.toFixed(2)}</p>
                    <p className="text-gray-500 mt-4 text-xs md:text-sm leading-relaxed font-medium line-clamp-2">{item.description}</p>
                  </div>

                  <div className="mt-8 space-y-3">
                    <button 
                      onClick={() => handleMoveToCart(wishlist_item._id)}
                      disabled={item.stock <= 0}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold hover:from-blue-400 hover:to-indigo-400 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart size={16} />
                      {item.stock > 0 ? 'Move to Cart' : 'Out of Stock'}
                    </button>
                    
                    <button 
                      onClick={() => handleRemove(wishlist_item._id)}
                      className="w-full py-3 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-500/20 transition-all active:scale-[0.98] border border-red-500/20 flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={16} />
                      Remove from Wishlist
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
