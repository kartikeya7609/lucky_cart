import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import {
  Search, Laptop, Shirt, Armchair, Home, Utensils,
  Watch, Dumbbell, Gamepad, Sparkles, Car, Wrench, Box, AlertCircle, ChevronDown,
  LayoutGrid
} from 'lucide-react';

const Marketplace = () => {
  const { token, user, addToast } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileCategories, setShowMobileCategories] = useState(false);

  
  const [cartLoadingId, setCartLoadingId] = useState(null);
  const [wishlistLoadingId, setWishlistLoadingId] = useState(null);

  
  const searchQuery = searchParams.get('q') || '';
  const activeCategory = searchParams.get('category') || 'All';
  const sort = searchParams.get('sort') || 'random';
  const page = parseInt(searchParams.get('page')) || 1;
  const [pagination, setPagination] = useState({ pages: 1, hasPrev: false, hasNext: false });

  
  const [searchInput, setSearchInput] = useState(searchQuery);

  
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (activeCategory !== 'All') params.set('category', activeCategory);
      params.set('sort', sort);
      params.set('page', String(page));

      const res = await api.get(`/items?${params.toString()}`, token);
      setItems(res.items || []);
      setCategories(res.categories || []);
      setPagination(res.pagination || { pages: 1, hasPrev: false, hasNext: false });
    } catch (err) {
      console.error('Failed to load products:', err);
      addToast?.('Failed to load marketplace items.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    
  }, [searchQuery, activeCategory, sort, page]);

  
  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => next.set(k, v));
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ q: searchInput, page: '1' });
  };

  const handleCategoryChange = (category) => {
    updateParams({ category, page: '1' });
    setShowMobileCategories(false);
  };

  const handleSortChange = (e) => {
    updateParams({ sort: e.target.value, page: '1' });
  };

  const handlePageChange = (newPage) => {
    updateParams({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  
  const handleAddToCart = async (item) => {
    if (!token) {
      addToast('Please login to add items to your cart.', 'warning');
      return;
    }
    
    if (user?.role !== 'consumer') return;

    setCartLoadingId(item._id);
    try {
      
      await addToCart(item._id);
      addToast(`"${item.name}" added to cart!`, 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to add to cart.', 'danger');
    } finally {
      setCartLoadingId(null);
    }
  };

  
  const handleAddToWishlist = async (item) => {
    if (!token) {
      addToast('Please login to save items to wishlist.', 'warning');
      return;
    }
    if (user?.role !== 'consumer') return;

    setWishlistLoadingId(item._id);
    try {
      const res = await api.post(`/wishlist/add/${item._id}`, , token);
      addToast(res.message || 'Saved to wishlist!', 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to save to wishlist.', 'danger');
    } finally {
      setWishlistLoadingId(null);
    }
  };

  
  const getCategoryIcon = (category, size = 12) => {
    const cat = category.toLowerCase();
    if (cat.includes('elect')) return <Laptop size={size} />;
    if (cat.includes('fash') || cat.includes('cloth')) return <Shirt size={size} />;
    if (cat.includes('furn')) return <Armchair size={size} />;
    if (cat.includes('decor') || cat.includes('home')) return <Home size={size} />;
    if (cat.includes('kitchen') || cat.includes('appliance')) return <Utensils size={size} />;
    if (cat.includes('access')) return <Watch size={size} />;
    if (cat.includes('sport')) return <Dumbbell size={size} />;
    if (cat.includes('toy') || cat.includes('game')) return <Gamepad size={size} />;
    if (cat.includes('beaut') || cat.includes('cosm')) return <Sparkles size={size} />;
    if (cat.includes('auto') || cat.includes('car')) return <Car size={size} />;
    if (cat.includes('tool')) return <Wrench size={size} />;
    return <Box size={size} />;
  };

  
  const groupItemsByCategory = (itemsList) =>
    itemsList.reduce((acc, item) => {
      const cat = item.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, );

  
  const renderItemGrid = (itemsList) => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-white/5 border border-white/5 shadow-2xl overflow-hidden">
      {itemsList.map((item) => {
        const isLowStock = item.stock < 5 && item.stock > 0;
        const isSoldOut = item.stock === 0;
        const isConsumer = user?.role === 'consumer';
        const cartBusy = cartLoadingId === item._id;
        const wishBusy = wishlistLoadingId === item._id;

        return (
          <div
            key={item._id}
            className="group relative bg-[#16191D] flex flex-col hover:z-10 transition-all duration-500 hover:shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            
            <div className="aspect-square relative overflow-hidden bg-[#1C2025]">
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />

              <div
                onClick={() => navigate(`/item/${item._id}`)}
                className="block w-full h-full cursor-pointer"
              >
                <img
                  src={item.user_file}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600';
                  }}
                />
              </div>

              
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md border border-white/10 text-[7px] font-black uppercase tracking-[0.2em] text-white shadow-2xl">
                  {item.category}
                </span>
                {isLowStock && (
                  <span className="px-2 py-0.5 bg-red-500/80 backdrop-blur-md text-[7px] font-black uppercase tracking-[0.2em] text-white shadow-2xl animate-pulse">
                    Only {item.stock} left
                  </span>
                )}
                {isSoldOut && (
                  <span className="px-2 py-0.5 bg-gray-500/80 backdrop-blur-md text-[7px] font-black uppercase tracking-[0.2em] text-white shadow-2xl">
                    Sold Out
                  </span>
                )}
              </div>

              
              <div className="absolute inset-0 bg-[#0F1115]/90 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 p-6 backdrop-blur-sm translate-y-2 group-hover:translate-y-0 z-20">
                
                {isConsumer && !isSoldOut && (
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={cartBusy}
                    className="w-full py-3 bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {cartBusy ? 'Adding…' : 'Quick Add'}
                  </button>
                )}

                
                {isConsumer && (
                  <button
                    onClick={() => handleAddToWishlist(item)}
                    disabled={wishBusy}
                    className="w-full py-3 bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {wishBusy ? 'Saving…' : 'Save for Later'}
                  </button>
                )}

                
                {!token && (
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full py-3 bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 shadow-2xl"
                  >
                    Login to Buy
                  </button>
                )}

                <div
                  onClick={() => navigate(`/item/${item._id}`)}
                  className="text-[8px] font-black text-gray-500 hover:text-white transition-colors uppercase tracking-[0.3em] mt-1 border-b border-transparent hover:border-white/20 pb-0.5 cursor-pointer"
                >
                  View Asset
                </div>
              </div>
            </div>

            
            <div className="p-5 flex-grow flex flex-col border-t border-white/5 bg-gradient-to-b from-transparent to-black/20">
              
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-2 h-2 ${i < Math.floor(item.average_rating || 0) ? 'text-amber-400 fill-current' : 'text-gray-800'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-[7px] text-gray-700 font-black ml-1 uppercase tracking-widest">
                  {item.reviews?.length || 0} Reviews
                </span>
              </div>

              <div
                onClick={() => navigate(`/item/${item._id}`)}
                className="block mb-4 cursor-pointer"
              >
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.1em] truncate leading-tight group-hover:text-blue-400 transition-colors">
                  {item.name}
                </h3>
              </div>

              <div className="mt-auto pt-4 border-t border-white/5 flex items-end justify-between">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-gray-700 uppercase tracking-[0.2em] mb-1">Pricing</span>
                  <p className="text-xs font-black text-green-400 tracking-tight">₹{item.price?.toFixed(2)}</p>
                </div>
                <div className="h-6 w-px bg-white/5" />
                <div className="flex flex-col items-end">
                  <span className="text-[7px] font-black text-gray-700 uppercase tracking-[0.2em] mb-1">Stock</span>
                  <span className={`text-[8px] font-black ${item.stock > 0 ? 'text-blue-400' : 'text-red-500'} uppercase tracking-widest`}>
                    {item.stock > 0 ? `${item.stock} Available` : 'Out of Stock'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const isGroupedMode = sort === 'category' || (activeCategory && activeCategory !== 'All');

  
  return (
    <div className="min-h-screen bg-[#0F1115] px-2 py-8 md:px-4 md:py-12">
      <div className="max-w-[1600px] mx-auto">

        
        <div className="text-center mb-10 md:mb-16">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase mb-4">
            Market Exchange
          </h1>
          <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">
            Premium Selection • Professional Grade
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-8 max-w-4xl mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-2 p-1 bg-[#16191D] border border-white/5 shadow-2xl rounded-lg">
              <div className="flex-grow flex items-center px-4">
                <Search size={18} className="text-gray-500 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search assets..."
                  className="flex-grow py-4 bg-transparent text-white focus:outline-none placeholder:text-gray-600 text-sm min-w-0"
                />
              </div>
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 p-2 md:p-0 w-full md:w-auto">
                <select
                  value={sort}
                  onChange={handleSortChange}
                  className="w-full md:w-auto bg-[#0F1115] text-white text-[10px] font-black uppercase tracking-widest px-6 py-4 border border-white/5 focus:outline-none rounded-lg md:rounded-none cursor-pointer"
                >
                  <option value="random">Featured</option>
                  <option value="price_low">Price: Ascending</option>
                  <option value="price_high">Price: Descending</option>
                  <option value="category">By Category</option>
                </select>
                <button
                  type="submit"
                  className="w-full md:w-auto px-8 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 rounded-lg md:rounded-none"
                >
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>

        
        <div className="md:hidden px-4 mb-6">
          <button
            onClick={() => setShowMobileCategories((v) => !v)}
            className="flex items-center justify-between w-full px-6 py-4 bg-[#16191D] border border-white/5 text-white text-xs font-black uppercase tracking-widest rounded-lg"
          >
            <span>{activeCategory === 'All' ? 'Filter Categories' : activeCategory}</span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-300 ${showMobileCategories ? 'rotate-180' : ''}`}
            />
          </button>

          {showMobileCategories && (
            <div className="grid grid-cols-2 gap-2 mt-2 p-4 bg-[#16191D] border border-white/5 rounded-lg">
              <button
                onClick={() => handleCategoryChange('All')}
                className={`py-3 text-[9px] font-black uppercase tracking-widest transition-all rounded-lg ${activeCategory === 'All' ? 'bg-white text-black shadow-lg' : 'bg-[#0F1115] text-gray-400 hover:text-white border border-white/5'}`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`flex items-center justify-center gap-2 py-3 text-[9px] font-black uppercase tracking-widest transition-all rounded-lg ${activeCategory === category ? 'bg-white text-black shadow-lg' : 'bg-[#0F1115] text-gray-400 hover:text-white border border-white/5'}`}
                >
                  {getCategoryIcon(category)}
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        
        <div className="hidden md:block mb-12">
          <div className="flex items-center justify-between border-b border-white/5 pb-6 px-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">
                Explore Categories
              </span>
              <span className="px-2 py-0.5 bg-white/5 text-[8px] text-gray-400 font-bold border border-white/10 rounded-full">
                {categories.length + 1}
              </span>
            </div>
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">
              {items.length} Assets Matching
            </span>
          </div>

          
          <div className="flex overflow-x-auto no-scrollbar gap-3 px-4 pb-2 scroll-smooth">
            
            <button
              onClick={() => handleCategoryChange('All')}
              className={`flex flex-col items-center justify-center min-w-[100px] aspect-square p-4 flex-shrink-0 transition-all active:scale-95 group ${activeCategory === 'All' ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'bg-[#16191D] text-gray-500 hover:text-white border border-white/5'}`}
            >
              <LayoutGrid size={24} className="mb-2 transition-transform group-hover:scale-110" />
              <span className="text-[9px] font-black uppercase tracking-[0.15em]">All</span>
            </button>

            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`flex flex-col items-center justify-center min-w-[100px] aspect-square p-4 flex-shrink-0 transition-all active:scale-95 group ${activeCategory === category ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'bg-[#16191D] text-gray-500 hover:text-white border border-white/5'}`}
              >
                <span className="mb-2 transition-transform group-hover:scale-110">
                  {getCategoryIcon(category, 24)}
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-center line-clamp-1">
                  {category}
                </span>
              </button>
            ))}
          </div>
        </div>

        
        {loading ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">
              Retrieving marketplace items…
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 px-8 bg-[#16191D] border border-white/5 max-w-xl mx-auto rounded-3xl">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-black text-white uppercase tracking-wider">No Listings Found</h3>
            <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest leading-relaxed">
              We couldn't find any products matching your search criteria. Try modifying your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {isGroupedMode ? (
              Object.entries(groupItemsByCategory(items)).map(([category, catItems]) => (
                <div key={category} className="px-4">
                  <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-xl font-black text-white uppercase tracking-[0.3em]">{category}</h2>
                    <div className="flex-grow h-px bg-white/5" />
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                      {catItems.length} Items
                    </span>
                  </div>
                  {renderItemGrid(catItems)}
                </div>
              ))
            ) : (
              <div className="px-4">{renderItemGrid(items)}</div>
            )}

            
            {pagination.pages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-1 pt-12 p-2 bg-[#16191D] border border-white/5 max-w-full mx-auto rounded-xl">
                
                <button
                  disabled={!pagination.hasPrev}
                  onClick={() => handlePageChange(pagination.prevNum ?? page - 1)}
                  className="px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:pointer-events-none text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
                >
                  ← Prev
                </button>

                
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    onClick={() => handlePageChange(pNum)}
                    className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${page === pNum ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'}`}
                  >
                    {pNum}
                  </button>
                ))}

                
                <button
                  disabled={!pagination.hasNext}
                  onClick={() => handlePageChange(pagination.nextNum ?? page + 1)}
                  className="px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:pointer-events-none text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Marketplace;