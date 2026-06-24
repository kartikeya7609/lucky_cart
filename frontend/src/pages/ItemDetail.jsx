import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import {
  Star, ShoppingCart, Heart, Send, ArrowLeft,
  CheckCircle, Package, Barcode, User, MessageSquare,
  TrendingUp, Shield, Truck, RotateCcw, Pencil, Trash2, X
} from 'lucide-react';


const loadJsBarcode = () =>
  new Promise((resolve) => {
    if (window.JsBarcode) return resolve(window.JsBarcode);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
    script.onload = () => resolve(window.JsBarcode);
    document.head.appendChild(script);
  });


const BarcodeDisplay = ({ value }) => {
  const svgRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!value || !svgRef.current) return;
    setError(false);

    loadJsBarcode().then((JsBarcode) => {
      try {
        JsBarcode(svgRef.current, String(value), {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 12,
          fontOptions: 'bold',
          font: 'monospace',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 6,
          background: '#ffffff',
          lineColor: '#000000',
          margin: 12,
          marginTop: 12,
          marginBottom: 12,
          marginLeft: 16,
          marginRight: 16,
        });
      } catch {
        setError(true);
      }
    });
  }, [value]);

  if (!value) return null;

  return (
    <div style={{
      gridColumn: 'span 2',
      backgroundColor: '#ffffff',
      borderRadius: '1rem',
      padding: '0.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginTop: '0.75rem',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {error ? (
        <p style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', padding: '1rem' }}>
          Invalid barcode value
        </p>
      ) : (
        <svg ref={svgRef} style={{ width: '100%', maxWidth: '320px' }} />
      )}
    </div>
  );
};


const Stars = ({ count = 0, size = 16, interactive = false, onSelect }) => (
  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
    {Array.from({ length: 5 }, (_, i) => {
      const filled = i < Math.round(count);
      return (
        <Star
          key={i}
          size={size}
          fill={filled ? '#fbbf24' : 'none'}
          color={filled ? '#fbbf24' : '#374151'}
          style={{ cursor: interactive ? 'pointer' : 'default', transition: 'transform 0.1s' }}
          onMouseEnter={(e) => interactive && (e.currentTarget.style.transform = 'scale(1.2)')}
          onMouseLeave={(e) => interactive && (e.currentTarget.style.transform = 'scale(1)')}
          onClick={() => interactive && onSelect?.(i + 1)}
        />
      );
    })}
  </div>
);


const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user, addToast } = useAuth();
  const { addToCart } = useCart();

  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isVerifiedBuyer, setIsVerifiedBuyer] = useState(false);
  const [sortReviews, setSortReviews] = useState('newest');
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewImage, setReviewImage] = useState(null);
  const [reviewImagePreview, setReviewImagePreview] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [replies, setReplies] = useState();

  const [cartBusy, setCartBusy] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);

  
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/items/${id}?sort=${sortReviews}`, token);
      setItem(data.item);
      setReviews(data.reviews || []);
      setIsVerifiedBuyer(data.isVerifiedBuyer || false);
    } catch (err) {
      addToast('Product details could not be retrieved.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetails(); }, [id, sortReviews]);

  
  const handleAddToCart = async () => {
    if (!token) {
      addToast('Please log in to add items to your cart.', 'warning');
      navigate('/login');
      return;
    }
    if (user?.role !== 'consumer') return;

    setCartBusy(true);
    try {
      await addToCart(item._id);
      addToast(`"${item.name}" added to cart!`, 'success');
      setCartAdded(true);
      setTimeout(() => setCartAdded(false), 2500);
    } catch (err) {
      addToast(err?.message || 'Failed to add to cart.', 'danger');
    } finally {
      setCartBusy(false);
    }
  };

  
  const handleAddToWishlist = async () => {
    if (!token) {
      addToast('Please log in to manage your wishlist.', 'warning');
      return;
    }
    setWishBusy(true);
    try {
      const data = await api.post(`/wishlist/add/${id}`, , token);
      addToast(data.message || 'Added to wishlist!', 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to update wishlist', 'danger');
    } finally {
      setWishBusy(false);
    }
  };

  
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingReview(true);
    try {
      const formData = new FormData();
      formData.append('rating', rating);
      formData.append('comment', comment);
      if (reviewImage) formData.append('review_image', reviewImage);
      const data = await api.post(`/reviews/item/${id}`, formData, token, true);
      addToast(data.message || 'Review submitted!', 'success');
      setComment('');
      setRating(5);
      setReviewImage(null);
      setReviewImagePreview(null);
      fetchDetails();
    } catch (err) {
      addToast(err?.message || 'Review submission failed.', 'danger');
    } finally {
      setSubmittingReview(false);
    }
  };

  
  const handleReplySubmit = async (e, reviewId) => {
    e.preventDefault();
    const replyText = replies[reviewId];
    if (!replyText?.trim()) return;
    try {
      const data = await api.post(`/reviews/${reviewId}/reply`, { reply: replyText }, token);
      addToast(data.message || 'Reply posted.', 'success');
      setReplies((prev) => ({ ...prev, [reviewId]: '' }));
      fetchDetails();
    } catch (err) {
      addToast(err?.message || 'Failed to post reply.', 'danger');
    }
  };

  
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review? This cannot be undone.')) return;
    try {
      const data = await api.delete(`/reviews/${reviewId}`, token);
      addToast(data.message || 'Review deleted.', 'success');
      fetchDetails();
    } catch (err) {
      addToast(err?.message || 'Failed to delete review.', 'danger');
    }
  };

  
  const startEdit = (review) => {
    setEditingReviewId(review._id || review.id);
    setEditRating(review.rating);
    setEditComment(review.comment);
    setEditImage(null);
    setEditImagePreview(review.image_file || null);
  };

  const cancelEdit = () => {
    setEditingReviewId(null);
    setEditImage(null);
    setEditImagePreview(null);
  };

  
  const handleEditSave = async (e, reviewId) => {
    e.preventDefault();
    if (!editComment.trim()) return;
    try {
      const formData = new FormData();
      formData.append('rating', editRating);
      formData.append('comment', editComment);
      if (editImage) formData.append('review_image', editImage);
      const data = await api.put(`/reviews/${reviewId}`, formData, token, true);
      addToast(data.message || 'Review updated!', 'success');
      cancelEdit();
      fetchDetails();
    } catch (err) {
      addToast(err?.message || 'Failed to update review.', 'danger');
    }
  };

  
  const handleDeleteReply = async (reviewId) => {
    if (!window.confirm('Delete your reply?')) return;
    try {
      const data = await api.delete(`/reviews/${reviewId}/reply`, token);
      addToast(data.message || 'Reply deleted.', 'success');
      fetchDetails();
    } catch (err) {
      addToast(err?.message || 'Failed to delete reply.', 'danger');
    }
  };


  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0F1115', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.05)',
            borderTopColor: '#3b82f6',
            margin: '0 auto 1.5rem',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#4B5563', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            Loading product
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0F1115', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
        <Package size={56} color="#374151" />
        <p style={{ color: '#9CA3AF', fontSize: '1.1rem', fontWeight: '600' }}>Item not found or has been unlisted.</p>
        <Link to="/market" style={{ backgroundColor: '#ffffff', color: '#000000', fontWeight: '800', padding: '0.75rem 2rem', borderRadius: '0.75rem', textDecoration: 'none', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const isDiscounted = item.original_price && item.original_price > item.price;
  const discountPct = isDiscounted ? Math.floor(((item.original_price - item.price) / item.original_price) * 100) : 0;
  const isOutOfStock = item.stock <= 0;
  const isConsumer = user?.role === 'consumer';
  const isSeller = user && item.seller && String(item.seller._id || item.seller.id) === String(user.id || user._id);

  const avgRating = (item.average_rating || 0).toFixed(1);

  
  return (
    <div style={{ backgroundColor: '#0F1115', minHeight: '100vh', color: '#ffffff' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .detail-fade { animation: fadeUp 0.4s ease both; }
        .btn-cart:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,255,255,0.12); }
        .btn-cart:active { transform: translateY(0); }
        .btn-wish:hover { background: rgba(255,255,255,0.08) !important; }
        .review-card:hover { border-color: rgba(255,255,255,0.1) !important; }
        input:focus, textarea:focus { border-color: rgba(59,130,246,0.5) !important; }
      `}</style>

      <div style={{ maxWidth: '88rem', margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#6B7280', background: 'none', border: 'none', fontWeight: '800', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: '2.5rem', padding: 0, transition: 'color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
        >
          <ArrowLeft size={15} /> Back to marketplace
        </button>

        
        <div className="detail-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', marginBottom: '5rem', alignItems: 'start' }}>

          
          <div style={{
            position: 'relative',
            backgroundColor: '#16191D',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '2rem',
            padding: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '420px',
            overflow: 'hidden',
          }}>
            
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, rgba(59,130,246,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <img
              src={item.user_file}
              alt={item.name}
              style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', position: 'relative', zIndex: 1 }}
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600'; }}
            />
            {isOutOfStock && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                <span style={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', color: '#9CA3AF', padding: '0.5rem 1.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', padding: '0.25rem 0.875rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {item.category}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Stars count={Number(avgRating)} size={15} />
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#9CA3AF' }}>
                  {avgRating} <span style={{ color: '#4B5563' }}>({reviews.length} reviews)</span>
                </span>
              </div>
            </div>

            
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: '900', letterSpacing: '-0.03em', textTransform: 'uppercase', lineHeight: 1.05, margin: 0 }}>
              {item.name}
            </h1>

            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '2.25rem', fontWeight: '900', color: '#4ade80', letterSpacing: '-0.03em' }}>
                ₹{item.price.toFixed(2)}
              </span>
              {isDiscounted && (
                <>
                  <span style={{ fontSize: '1.4rem', fontWeight: '700', color: '#374151', textDecoration: 'line-through' }}>
                    ₹{item.original_price.toFixed(2)}
                  </span>
                  <span style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.1em' }}>
                    {discountPct}% OFF
                  </span>
                </>
              )}
            </div>

            
            <p style={{ color: '#9CA3AF', fontSize: '0.9375rem', lineHeight: '1.65', margin: 0, fontWeight: '500' }}>
              {item.description}
            </p>

            
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {(isConsumer || !user) && (
                <button
                  className="btn-cart"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || cartBusy}
                  style={{
                    backgroundColor: cartAdded ? '#4ade80' : '#ffffff',
                    color: cartAdded ? '#000000' : '#000000',
                    fontWeight: '800',
                    border: 'none',
                    padding: '0.9rem 2rem',
                    borderRadius: '0.875rem',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    transition: 'all 0.25s',
                    opacity: isOutOfStock ? 0.5 : 1,
                    minWidth: '160px',
                    justifyContent: 'center',
                  }}
                >
                  {cartBusy ? (
                    <>
                      <div style={{ width: '14px', height: '14px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      Adding…
                    </>
                  ) : cartAdded ? (
                    <><CheckCircle size={16} /> Added!</>
                  ) : (
                    <><ShoppingCart size={16} /> Add to Cart</>
                  )}
                </button>
              )}

              {(isConsumer || !user) && (
                <button
                  className="btn-wish"
                  onClick={handleAddToWishlist}
                  disabled={wishBusy}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontWeight: '800',
                    padding: '0.9rem 1.5rem',
                    borderRadius: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    opacity: wishBusy ? 0.6 : 1,
                  }}
                >
                  <Heart size={16} fill={wishBusy ? '#f87171' : 'none'} color={wishBusy ? '#f87171' : '#fff'} />
                  {wishBusy ? 'Saving…' : 'Wishlist'}
                </button>
              )}
            </div>

            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
              {[
                { icon: <Truck size={13} />, label: 'Fast Delivery' },
                { icon: <Shield size={13} />, label: 'Secure Checkout' },
                { icon: <RotateCcw size={13} />, label: 'Easy Returns' },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#4B5563', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {icon} {label}
                </div>
              ))}
            </div>

            
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.6rem', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.35rem' }}>Availability</p>
                <p style={{ fontWeight: '800', margin: 0, color: isOutOfStock ? '#f87171' : '#ffffff', fontSize: '0.9rem' }}>
                  {isOutOfStock ? 'Out of Stock' : `${item.stock} units`}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.6rem', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.35rem' }}>Seller</p>
                <p style={{ fontWeight: '800', margin: 0, color: '#60a5fa', fontSize: '0.9rem' }}>{item.seller?.username || 'System Partner'}</p>
              </div>

              
              {item.barcode && <BarcodeDisplay value={item.barcode} />}
            </div>
          </div>
        </div>

        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'start' }}>

          
          <div style={{ position: 'sticky', top: '1.5rem' }}>
            <div style={{ backgroundColor: '#16191D', padding: '2rem', borderRadius: '1.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                <MessageSquare size={20} color="#3b82f6" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>Leave a Review</h3>
              </div>

              {!user ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '1rem' }}>
                  <User size={32} color="#374151" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginBottom: '1.25rem', fontWeight: '500' }}>
                    Sign in to share your experience
                  </p>
                  <Link to="/login" style={{ backgroundColor: '#3b82f6', color: '#ffffff', fontWeight: '800', padding: '0.6rem 1.5rem', borderRadius: '0.625rem', textDecoration: 'none', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Login
                  </Link>
                </div>
              ) : !isVerifiedBuyer ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '1rem' }}>
                  <Shield size={32} color="#374151" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: '#6B7280', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', lineHeight: 1.5 }}>
                    Only verified buyers can leave a review
                  </p>
                  <span style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', padding: '0.35rem 0.875rem', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.1em' }}>
                    Purchase Required
                  </span>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: '800', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>Your Rating</label>
                    <Stars count={rating} size={28} interactive onSelect={setRating} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: '800', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>Your Review</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Share your honest experience with this product..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#0F1115', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '0.75rem 1rem', color: '#ffffff', outline: 'none', resize: 'vertical', fontSize: '0.875rem', lineHeight: 1.6, transition: 'border-color 0.2s' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: '800', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>Attach Photo (optional)</label>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      backgroundColor: '#0F1115', border: '1px dashed rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem', padding: '0.75rem 1rem', cursor: 'pointer',
                      transition: 'border-color 0.2s'
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                    >
                      <input
                        type="file"
                        accept="image}
          <div style={{ gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.025em', margin: '0 0 0.25rem' }}>Customer Reviews</h3>
                <p style={{ color: '#4B5563', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} • avg {avgRating} / 5
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['newest', 'highest'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSortReviews(type)}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: sortReviews === type ? '#ffffff' : 'transparent', color: sortReviews === type ? '#000000' : '#6B7280', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    {type === 'newest' ? 'Newest' : 'Top Rated'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '1.5rem' }}>
                  <TrendingUp size={40} color="#1f2937" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: '#374151', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    No reviews yet — be the first!
                  </p>
                </div>
              ) : (
                reviews.map((review) => {
                  const rid = review._id || review.id;
                  const isMyReview = user && String(review.user?._id || review.user) === String(user.id || user._id);
                  const canDelete = isMyReview || (isSeller);
                  const isEditing = editingReviewId === rid;

                  return (
                    <div key={rid} className="review-card" style={{ backgroundColor: '#16191D', padding: '1.75rem', borderRadius: '1.5rem', border: `1px solid ${isEditing ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.04)'}`, transition: 'border-color 0.2s' }}>

                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                          <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '50%', background: 'linear-gradient(135deg, #1e3a5f, #1e1b4b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', border: '1px solid rgba(255,255,255,0.08)', fontSize: '1rem', color: '#60a5fa', flexShrink: 0 }}>
                            {(review.user?.username?.[0] || 'U').toUpperCase()}
                          </div>
                          <div>
                            <h4 style={{ margin: '0 0 0.2rem', fontWeight: '800', fontSize: '0.9rem' }}>{review.user?.username || 'Anonymous'}</h4>
                            <p style={{ margin: 0, fontSize: '0.6rem', color: '#4B5563', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              {review.date_posted ? new Date(review.date_posted).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                            <Stars count={review.rating} size={13} />
                            {review.is_verified && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', backgroundColor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', padding: '0.15rem 0.5rem', borderRadius: '0.375rem' }}>
                                <CheckCircle size={9} color="#4ade80" />
                                <span style={{ fontSize: '0.5rem', fontWeight: '900', color: '#4ade80', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Verified</span>
                              </div>
                            )}
                          </div>

                          
                          {!isEditing && (isMyReview || canDelete) && (
                            <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem' }}>
                              {isMyReview && (
                                <button
                                  onClick={() => startEdit(review)}
                                  title="Edit review"
                                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '0.5rem', padding: '0.35rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                                >
                                  <Pencil size={12} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteReview(rid)}
                                  title="Delete review"
                                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '0.5rem', padding: '0.35rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      
                      {isEditing ? (
                        <form onSubmit={(e) => handleEditSave(e, rid)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', backgroundColor: 'rgba(59,130,246,0.04)', borderRadius: '1rem', border: '1px solid rgba(59,130,246,0.12)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Editing Review</span>
                            <button type="button" onClick={cancelEdit} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                              <X size={15} />
                            </button>
                          </div>

                          
                          <div>
                            <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: '800', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.4rem' }}>Rating</label>
                            <Stars count={editRating} size={24} interactive onSelect={setEditRating} />
                          </div>

                          
                          <div>
                            <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: '800', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.4rem' }}>Review</label>
                            <textarea
                              rows={3}
                              required
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#0F1115', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem', color: '#ffffff', outline: 'none', resize: 'vertical', fontSize: '0.875rem', lineHeight: 1.6 }}
                            />
                          </div>

                          
                          <div>
                            <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: '800', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.4rem' }}>Replace Photo (optional)</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#0F1115', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '0.625rem', padding: '0.6rem 0.875rem', cursor: 'pointer' }}>
                              <input type="file" accept="image}
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="submit" style={{ flex: 1, padding: '0.6rem', background: 'linear-gradient(135deg, #3b82f6, #4f46e5)', border: 'none', color: '#fff', fontWeight: '800', borderRadius: '0.625rem', cursor: 'pointer', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                              Save Changes
                            </button>
                            <button type="button" onClick={cancelEdit} style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280', fontWeight: '800', borderRadius: '0.625rem', cursor: 'pointer', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <p style={{ color: '#D1D5DB', fontSize: '0.875rem', lineHeight: '1.65', margin: '0 0 1rem 0', fontWeight: '500' }}>
                            {review.comment}
                          </p>

                          {review.image_file && (
                            <div style={{ maxWidth: '20rem', borderRadius: '0.875rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.25rem' }}>
                              <img src={review.image_file} alt="Review" style={{ width: '100%', display: 'block' }} />
                            </div>
                          )}

                          
                          {review.seller_reply ? (
                            <div style={{ backgroundColor: 'rgba(59,130,246,0.04)', padding: '1.25rem', borderRadius: '0.875rem', border: '1px solid rgba(59,130,246,0.12)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Seller Response</p>
                                {isSeller && (
                                  <button
                                    onClick={() => handleDeleteReply(rid)}
                                    title="Delete reply"
                                    style={{ background: 'none', border: 'none', color: '#4B5563', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.15rem', borderRadius: '0.25rem', transition: 'color 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#4B5563'}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                              <p style={{ margin: 0, fontSize: '0.875rem', color: '#9CA3AF', fontStyle: 'italic' }}>"{review.seller_reply}"</p>
                            </div>
                          ) : isSeller && (
                            <form onSubmit={(e) => handleReplySubmit(e, rid)} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                              <input
                                type="text"
                                placeholder="Reply to this review…"
                                value={replies[rid] || ''}
                                onChange={(e) => setReplies({ ...replies, [rid]: e.target.value })}
                                required
                                style={{ flexGrow: 1, backgroundColor: '#0F1115', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.625rem', padding: '0.5rem 0.875rem', color: '#ffffff', fontSize: '0.8rem', outline: 'none', transition: 'border-color 0.2s' }}
                              />
                              <button type="submit" style={{ backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', fontWeight: '800', padding: '0.5rem 1.25rem', borderRadius: '0.625rem', fontSize: '0.7rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Reply
                              </button>
                            </form>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;