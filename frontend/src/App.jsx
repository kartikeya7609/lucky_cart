import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Marketplace from './pages/Marketplace';
import ItemDetail from './pages/ItemDetail';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import PublicWishlist from './pages/PublicWishlist';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Social from './pages/Social';
import SellerPanel from './pages/SellerPanel';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Receipt from './pages/Receipt';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-[#0F1115] text-white selection:bg-yellow-500 selection:text-black">

            <NavbarWithCondition />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
              <Routes>
                {/* Default routes */}
                <Route path="/" element={<Navigate to="/market" replace />} />
                <Route path="/market" element={<Marketplace />} />
                <Route path="/item/:id" element={<ItemDetail />} />

                {/* Authentication routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* User routes */}
                <Route path="/cart" element={<Cart />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/wishlist/public/:username" element={<PublicWishlist />} />
                <Route path="/social" element={<Social />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/account" element={<Profile />} />

                {/* Seller routes */}
                <Route path="/listings" element={<SellerPanel />} />

                {/* Admin routes */}
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />

                {/* Receipt printable view */}
                <Route path="/receipt/:id" element={<Receipt />} />
              </Routes>
            </main>

            <FooterWithCondition />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

// Help component to hide navbar on the print receipt view
const NavbarWithCondition = () => {
  const { pathname } = useLocation();
  const isReceiptPage = pathname.startsWith('/receipt');
  if (isReceiptPage) return null;
  return <Navbar />;
};

// Help component to hide footer on the print receipt view
const FooterWithCondition = () => {
  const { pathname } = useLocation();
  const isReceiptPage = pathname.startsWith('/receipt');
  if (isReceiptPage) return null;
  return <Footer />;
};

export default App;
