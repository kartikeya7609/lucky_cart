import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { token, user, addToast, refreshUser } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [estDelivery, setEstDelivery] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch cart data from API
  const fetchCart = async (coupon = null) => {
    if (!token || (user && user.role === 'seller')) return;
    setLoading(true);
    try {
      const code = coupon || (appliedCoupon ? appliedCoupon.code : null);
      const url = code ? `/cart?couponCode=${code}` : '/cart';
      const data = await api.get(url, token);
      
      setCartItems(data.cartItems || []);
      setSubtotal(data.subtotal || 0);
      setDiscount(data.discount || 0);
      setTotal(data.total || 0);
      setEstDelivery(data.estDelivery || '');
      setAppliedCoupon(data.appliedCoupon || null);

      // Handle stock and expiration notices
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => addToast(msg, 'warning'));
      }
    } catch (err) {
      console.error("Error fetching cart:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user && user.role !== 'seller') {
      fetchCart();
    } else {
      setCartItems([]);
      setSubtotal(0);
      setDiscount(0);
      setTotal(0);
      setAppliedCoupon(null);
    }
  }, [token, user]);

  // Add Item to Cart
  const addToCart = async (itemId) => {
    if (!token) {
      addToast('Please login to purchase items.', 'warning');
      return false;
    }
    try {
      const data = await api.post('/cart/add', { item_id: itemId }, token);
      addToast(data.message || 'Added to cart!', 'success');
      await fetchCart();
      return true;
    } catch (err) {
      addToast(err.message || 'Failed to add item.', 'danger');
      return false;
    }
  };

  // Remove Item from Cart
  const removeFromCart = async (cartItemId) => {
    try {
      const data = await api.delete(`/cart/${cartItemId}`, token);
      addToast(data.message || 'Removed from cart.', 'info');
      await fetchCart();
      return true;
    } catch (err) {
      addToast(err.message || 'Failed to remove item.', 'danger');
      return false;
    }
  };

  // Move Cart Item to Wishlist
  const saveForLater = async (cartItemId) => {
    try {
      const data = await api.post(`/cart/save-for-later/${cartItemId}`, {}, token);
      addToast(data.message || 'Saved for later.', 'info');
      await fetchCart();
      return true;
    } catch (err) {
      addToast(err.message || 'Failed to save for later.', 'danger');
      return false;
    }
  };

  // Apply Coupon
  const applyCouponCode = async (code) => {
    try {
      const data = await api.post('/cart/apply-coupon', { coupon_code: code }, token);
      addToast(data.message || 'Coupon applied!', 'success');
      setAppliedCoupon(data.coupon);
      await fetchCart(data.coupon.code);
      return true;
    } catch (err) {
      addToast(err.message || 'Invalid coupon.', 'danger');
      return false;
    }
  };

  // Process Checkout
  const checkoutCart = async (addressId) => {
    try {
      const payload = { addressId };
      if (appliedCoupon) payload.couponCode = appliedCoupon.code;

      const data = await api.post('/cart/checkout', payload, token);
      addToast(data.message || 'Checkout successful!', 'success');
      
      // Clear local states
      setCartItems([]);
      setSubtotal(0);
      setDiscount(0);
      setTotal(0);
      setAppliedCoupon(null);

      // Refresh buyer budget
      await refreshUser();
      
      return { success: true, orderId: data.orderId };
    } catch (err) {
      addToast(err.message || 'Checkout failed.', 'danger');
      return { success: false, error: err.message };
    }
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      subtotal,
      discount,
      total,
      estDelivery,
      appliedCoupon,
      loading,
      addToCart,
      removeFromCart,
      saveForLater,
      applyCoupon: applyCouponCode,
      checkoutCart,
      refreshCart: fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
};
