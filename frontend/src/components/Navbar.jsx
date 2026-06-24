import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { api } from '../utils/api';
import { 
  ShoppingCart, 
  Heart, 
  LogOut, 
  LogIn, 
  Shield, 
  Compass,
  List,
  User,
  ShoppingBag,
  Bell,
  BellDot,
  CheckCheck,
  AlertTriangle,
  ClipboardList, 
  Clover,
  Download,
  Users
} from 'lucide-react';

const Navbar = () => {
  const { user, token, logout } = useAuth();
  const { cartItems } = useCart();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifRef = useRef(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const isActive = (path) => location.pathname === path;
  const totalCartQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  /* ── Fetch notifications ─────────────────────────────── */
  const fetchNotifications = async () => {
    if (!token || !user || user.role === 'admin') return;
    try {
      const data = await api.get('/orders/notifications', token);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Silent fail — don't disrupt UI
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [token, user]);

  /* ── Close panel when clicking outside ──────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Open panel + mark all read ─────────────────────── */
  const handleBellClick = async () => {
    setShowNotifPanel((prev) => !prev);
    if (!showNotifPanel && unreadCount > 0) {
      try {
        await api.post('/orders/notifications/mark-read', {}, token);
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      } catch {
        // Silent fail
      }
    }
  };

  /* ── Helpers ─────────────────────────────────────────── */
  const isCancellationNotif = (msg) => msg?.includes('Cancellation Request') || msg?.includes('cancellation');
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <>
    <nav className="sticky top-0 z-50 bg-[#0F1115]/90 backdrop-blur-xl border-b border-white/5 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <div className="flex items-center gap-12">
            <Link to="/market" className="flex items-center group">
              <div className="w-10 h-10 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.3)] group-hover:rotate-12 group-hover:scale-110 transition-all duration-300">
                <Clover size={22} strokeWidth={2.5} className="text-white drop-shadow-md" />
              </div>
              <div className="ml-3 flex flex-col">
                <span className="text-white font-black text-lg leading-tight tracking-tighter uppercase">Lucky</span>
                <span className="text-yellow-500 text-[10px] font-bold tracking-[0.2em] uppercase leading-none">Cart</span>
              </div>
            </Link>

            {/* Main Nav Links */}
            <div className="hidden lg:block">
              <ul className="flex items-center gap-2">
                <li>
                  <Link 
                    to="/market"
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      isActive('/market') 
                        ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Compass size={16} />
                    Browse
                  </Link>
                </li>

                {user && user.role === 'consumer' && (
                  <>
                    <li>
                      <Link 
                        to="/cart"
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          isActive('/cart') 
                            ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <ShoppingCart size={16} />
                        Cart
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/wishlist"
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          isActive('/wishlist') 
                            ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Heart size={16} />
                        Wishlist
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/social"
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          isActive('/social') 
                            ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Users size={16} />
                        Social
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/orders"
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          isActive('/orders') 
                            ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <ShoppingBag size={16} />
                        Orders
                      </Link>
                    </li>
                  </>
                )}

                {user && user.role === 'seller' && (
                  <>
                    <li className="w-px h-6 bg-white/5 mx-2"></li>
                    <li>
                      <Link 
                        to="/listings"
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          isActive('/listings') 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/5'
                        }`}
                      >
                        <List size={16} />
                        Inventory
                      </Link>
                    </li>
                  </>
                )}

                {user && user.role === 'admin' && (
                  <li>
                    <Link 
                      to="/admin/dashboard"
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        isActive('/admin/dashboard') 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'text-gray-500 hover:text-amber-400 hover:bg-amber-500/5'
                      }`}
                    >
                      <Shield size={16} />
                      Console
                    </Link>
                  </li>
                )}

                {user && user.role !== 'admin' && (
                  <li>
                    <Link 
                      to="/account"
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        isActive('/account') 
                          ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                          : 'text-gray-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <User size={16} />
                      Account
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            
            {/* ── PWA Install Button ──────────────────────── */}
            {isInstallable && (
              <button 
                onClick={handleInstallClick}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
              >
                Install App
              </button>
            )}

            {/* ── Notification Bell ─────────────────────── */}
            {user && user.role !== 'admin' && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={handleBellClick}
                  className={`relative w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                    unreadCount > 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10'
                  }`}
                  title="Notifications"
                >
                  {unreadCount > 0 ? <BellDot size={18} /> : <Bell size={18} />}
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-amber-500 text-black text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-amber-500/30 animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Panel */}
                {showNotifPanel && (
                  <div className="fixed top-16 right-4 left-4 sm:absolute sm:top-12 sm:right-0 sm:left-auto w-auto sm:w-80 max-h-[70vh] sm:max-h-[420px] overflow-y-auto bg-[#16191D] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-[200]">
                    {/* Header */}
                    <div className="sticky top-0 bg-[#16191D] px-4 py-3 border-b border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notifications</span>
                      {notifications.some((n) => !n.is_read) && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-blue-400">
                          <CheckCheck size={11} /> All read
                        </div>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <Bell size={28} className="mx-auto mb-3 text-gray-700" />
                        <p className="text-[11px] text-gray-600 font-bold uppercase tracking-wider">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.04]">
                        {notifications.map((notif) => {
                          const isCancellation = isCancellationNotif(notif.message);
                          return (
                            <div
                              key={notif._id}
                              className={`px-4 py-3 transition-colors ${
                                !notif.is_read
                                  ? isCancellation
                                    ? 'bg-amber-500/8 hover:bg-amber-500/12'
                                    : 'bg-white/[0.03] hover:bg-white/[0.06]'
                                  : 'hover:bg-white/[0.02]'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                {isCancellation ? (
                                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <AlertTriangle size={13} className="text-amber-400" />
                                  </div>
                                ) : (
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    !notif.is_read ? 'bg-blue-500/15' : 'bg-white/5'
                                  }`}>
                                    <Bell size={13} className={!notif.is_read ? 'text-blue-400' : 'text-gray-600'} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs leading-relaxed ${
                                    isCancellation ? 'text-amber-200' : !notif.is_read ? 'text-white' : 'text-gray-400'
                                  }`}>
                                    {notif.message}
                                  </p>
                                  <p className="text-[9px] text-gray-600 font-bold mt-1 uppercase tracking-wider">
                                    {timeAgo(notif.date_created || notif.createdAt)}
                                  </p>
                                </div>
                                {!notif.is_read && (
                                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
                                    isCancellation ? 'bg-amber-400' : 'bg-blue-400'
                                  }`} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Footer — for sellers with cancellation requests */}
                    {user?.role === 'seller' && notifications.some((n) => isCancellationNotif(n.message) && !n.is_read) && (
                      <div className="sticky bottom-0 bg-[#16191D] px-4 py-3 border-t border-white/5">
                        <Link
                          to="/listings"
                          onClick={() => setShowNotifPanel(false)}
                          className="block w-full text-center py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-500/20 transition-all"
                        >
                          Go to Sales Panel →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── User Pill ──────────────────────────────── */}
            {user ? (
              <div className="flex items-center gap-3 pl-3 pr-1.5 py-1.5 bg-[#16191D] border border-white/5 rounded-2xl shadow-xl">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">{user.username}</span>
                  {user.role !== 'admin' && (
                    <span className="text-xs font-black text-green-400 mt-0.5 leading-none">
                      {user.prettier_budget || `₹${user.budget?.toFixed(2)}`}
                    </span>
                  )}
                </div>
                
                {user.role === 'consumer' && totalCartQty > 0 && (
                  <Link to="/cart" className="relative p-2 text-gray-400 hover:text-white transition-all">
                    <ShoppingCart size={18} />
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full text-[8px] font-bold px-1.5 py-0.5">
                      {totalCartQty}
                    </span>
                  </Link>
                )}

                <button 
                  onClick={logout}
                  className="w-8 h-8 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-6 py-3 text-xs font-black text-gray-500 hover:text-white uppercase tracking-widest transition-all">
                  Login
                </Link>
                <Link to="/register" className="px-8 py-3 bg-white text-black text-xs font-black rounded-xl uppercase tracking-[0.2em] hover:bg-gray-200 transition-all active:scale-95 shadow-xl shadow-white/5">
                  Join
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>

    {/* ── Mobile Bottom Navigation ── */}
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F1115]/95 backdrop-blur-xl border-t border-white/10 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        <Link 
          to="/market"
          className={`flex-1 flex flex-col items-center justify-center h-full space-y-1 transition-all ${
            isActive('/market') ? 'text-blue-400' : 'text-gray-500 hover:text-white'
          }`}
        >
          <Compass size={20} className={isActive('/market') ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''} />
          <span className="text-[9px] font-black uppercase tracking-widest">Browse</span>
        </Link>

        {user && user.role === 'consumer' && (
          <>
            <Link 
              to="/cart"
              className={`flex-1 flex flex-col items-center justify-center h-full space-y-1 transition-all relative ${
                isActive('/cart') ? 'text-blue-400' : 'text-gray-500 hover:text-white'
              }`}
            >
              <div className="relative">
                <ShoppingCart size={20} className={isActive('/cart') ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''} />
                {totalCartQty > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-blue-500 text-white rounded-full text-[8px] font-bold px-1.5 py-0.5 border border-[#0F1115]">
                    {totalCartQty}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest">Cart</span>
            </Link>

            <Link 
              to="/orders"
              className={`flex-1 flex flex-col items-center justify-center h-full space-y-1 transition-all ${
                isActive('/orders') ? 'text-blue-400' : 'text-gray-500 hover:text-white'
              }`}
            >
              <ShoppingBag size={20} className={isActive('/orders') ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''} />
              <span className="text-[9px] font-black uppercase tracking-widest">Orders</span>
            </Link>

            <Link 
              to="/wishlist"
              className={`flex-1 flex flex-col items-center justify-center h-full space-y-1 transition-all ${
                isActive('/wishlist') ? 'text-blue-400' : 'text-gray-500 hover:text-white'
              }`}
            >
              <Heart size={20} className={isActive('/wishlist') ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''} />
              <span className="text-[9px] font-black uppercase tracking-widest">Saved</span>
            </Link>

            <Link 
              to="/social"
              className={`flex-1 flex flex-col items-center justify-center h-full space-y-1 transition-all ${
                isActive('/social') ? 'text-blue-400' : 'text-gray-500 hover:text-white'
              }`}
            >
              <Users size={20} className={isActive('/social') ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''} />
              <span className="text-[9px] font-black uppercase tracking-widest">Social</span>
            </Link>
          </>
        )}

        {user && user.role === 'seller' && (
          <Link 
            to="/listings"
            className={`flex-1 flex flex-col items-center justify-center h-full space-y-1 transition-all ${
              isActive('/listings') ? 'text-blue-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <List size={20} className={isActive('/listings') ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">Inventory</span>
          </Link>
        )}

        {user && user.role === 'admin' && (
          <Link 
            to="/admin/dashboard"
            className={`flex-1 flex flex-col items-center justify-center h-full space-y-1 transition-all ${
              isActive('/admin/dashboard') ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400'
            }`}
          >
            <Shield size={20} className={isActive('/admin/dashboard') ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">Console</span>
          </Link>
        )}

        {user && user.role !== 'admin' && (
          <>
            <Link 
              to="/account"
              className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                isActive('/account') ? 'text-blue-400' : 'text-gray-500'
              }`}
            >
              <User size={20} className="mb-1" />
              <span className="text-[9px] font-black uppercase tracking-wider">Account</span>
            </Link>
            {isInstallable && (
              <button 
                onClick={handleInstallClick}
                className="flex flex-col items-center p-2 rounded-xl transition-all text-blue-400"
              >
                <div className="bg-blue-500/20 p-1.5 rounded-full mb-0.5">
                  <Download size={14} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider">Install</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
};

export default Navbar;
