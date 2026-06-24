import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { api } from '../utils/api';
import { Heart, Globe, Lock, ShoppingCart, AlertCircle } from 'lucide-react';

const PublicWishlist = () => {
  const { username } = useParams();
  const { token, user, addToast } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [wishlistData, setWishlistData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPublicWishlist = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch public wishlist using optional token
      const data = await api.get(`/wishlist/public/${username}`, token);
      setWishlistData(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to retrieve wishlist. It may be private or not exist.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicWishlist();
  }, [username, token]);

  const handleAddToCart = async (itemName) => {
    if (!token) {
      addToast('Please login to purchase items.', 'warning');
      return;
    }
    const success = await addToCart(itemName);
    if (success) {
      addToast(`Added ${itemName} to your cart!`, 'success');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '10rem 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading public wishlist...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F1115] px-4 py-12 flex items-center justify-center">
        <div className="text-center py-20 px-8 bg-[#16191D] border border-white/5 max-w-xl mx-auto rounded-3xl shadow-2xl">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-black text-white uppercase tracking-wider">Access Restricted</h3>
          <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest leading-relaxed">
            {error}
          </p>
          <Link to="/market" className="inline-block mt-8 px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all shadow-xl active:scale-95 text-xs uppercase tracking-wider">
            Go to Market
          </Link>
        </div>
      </div>
    );
  }

  const items = wishlistData?.items || [];

  return (
    <div className="min-h-screen bg-[#0F1115] px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase">
            {wishlistData?.username || username}'s Wishlist
          </h1>
          <p className="mt-4 text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">
            Public Share Collection
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-[#16191D] rounded-[3rem] border border-white/5">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={40} className="text-gray-600" />
            </div>
            <p className="text-gray-400 text-xl font-medium">This wishlist is currently empty.</p>
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

                  {(!user || user.role === 'consumer') && (
                    <div className="mt-8">
                      <button 
                        onClick={() => handleAddToCart(item.name)}
                        disabled={item.stock <= 0}
                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold hover:from-blue-400 hover:to-indigo-400 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider"
                      >
                        <ShoppingCart size={16} />
                        {item.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicWishlist;
