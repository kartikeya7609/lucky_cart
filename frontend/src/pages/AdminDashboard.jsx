import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import Chart from 'chart.js/auto';
import './AdminDashboard.css';
import {
  ShoppingCart, LayoutDashboard, ClipboardList, Package, Users, LineChart,
  Star, Activity, Settings, LogOut, Calendar, Download, IndianRupee,
  TrendingUp, TrendingDown, RefreshCw, Search, Eye, Plus, UserPlus,
  CornerUpLeft, Truck, Check, Trash, Edit, X,
  ChevronLeft, ChevronRight, Table, LayoutGrid, Upload, Trash2, Menu
} from 'lucide-react';

const AdminDashboard = () => {
  const { token, logout, addToast } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Settings State
  const [storeName, setStoreName] = useState('Lucky Cart India');
  const [supportEmail, setSupportEmail] = useState('support@luckycart.in');
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  // Search states
  const [orderQuery, setOrderQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  
  // Scoped Product Page states
  const [viewMode, setViewMode] = useState('table');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [productSortKey, setProductSortKey] = useState('name');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [editingStockVal, setEditingStockVal] = useState('');
  const [productsPage, setProductsPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [reviewQuery, setReviewQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const revChartRef = useRef(null);
  const donutChartRef = useRef(null);
  const trendChartRef = useRef(null);
  const catChartRef = useRef(null);
  const payChartRef = useRef(null);

  const revChartInstance = useRef(null);
  const donutChartInstance = useRef(null);
  const trendChartInstance = useRef(null);
  const catChartInstance = useRef(null);
  const payChartInstance = useRef(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [ordersData, usersData, productsData, reviewsData, activityData] = await Promise.all([
        api.get('/admin/orders', token).catch(() => []),
        api.get('/admin/users', token).catch(() => []),
        api.get('/admin/products', token).catch(() => []),
        api.get('/admin/reviews', token).catch(() => []),
        api.get('/admin/activity', token).catch(() => [])
      ]);
      setOrders(ordersData || []);
      setUsers(usersData || []);
      setProducts(productsData || []);
      setReviews(reviewsData || []);
      setActivity(activityData || []);
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Access Denied.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'overview') {
      if (revChartRef.current) {
        if (revChartInstance.current) revChartInstance.current.destroy();
        revChartInstance.current = new Chart(revChartRef.current, {
          type: 'bar',
          data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{ label: 'Revenue', data: [52000, 67000, 45000, 80000, 95000, 71000, 62000], backgroundColor: '#1D9E75', borderRadius: 4, barThickness: 24 }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { callback: v => '₹' + Math.round(v / 1000) + 'k', font: { size: 11 } } } } }
        });
      }
      if (donutChartRef.current) {
        if (donutChartInstance.current) donutChartInstance.current.destroy();
        donutChartInstance.current = new Chart(donutChartRef.current, {
          type: 'doughnut',
          data: {
            labels: ['Delivered', 'Processing', 'Pending', 'Cancelled'],
            datasets: [{ data: [58, 24, 12, 6], backgroundColor: ['#1D9E75', '#378ADD', '#EF9F27', '#E24B4A'], borderWidth: 0, hoverOffset: 4 }]
          },
          options: { responsive: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.label + ': ' + ctx.parsed + '%' } } } }
        });
      }
    } else if (activeTab === 'analytics') {
      if (trendChartRef.current) {
        if (trendChartInstance.current) trendChartInstance.current.destroy();
        trendChartInstance.current = new Chart(trendChartRef.current, {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{ label: 'Revenue', data: [280000, 310000, 295000, 360000, 420000, 482000], borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.08)', fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: '#1D9E75' }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { callback: v => '₹' + Math.round(v / 1000) + 'k', font: { size: 11 } } } } }
        });
      }
      if (catChartRef.current) {
        if (catChartInstance.current) catChartInstance.current.destroy();
        catChartInstance.current = new Chart(catChartRef.current, {
          type: 'bar',
          data: {
            labels: ['Audio', 'Phones', 'Accessories', 'TVs', 'Peripherals'],
            datasets: [{ label: 'Sales %', data: [34, 28, 18, 12, 8], backgroundColor: ['#1D9E75', '#378ADD', '#EF9F27', '#534AB7', '#E24B4A'], borderRadius: 4, barThickness: 22 }]
          },
          options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { callback: v => v + '%', font: { size: 11 } } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } } }
        });
      }
      if (payChartRef.current) {
        if (payChartInstance.current) payChartInstance.current.destroy();
        payChartInstance.current = new Chart(payChartRef.current, {
          type: 'pie',
          data: {
            labels: ['UPI', 'Card', 'COD'],
            datasets: [{ data: [54, 28, 18], backgroundColor: ['#1D9E75', '#378ADD', '#EF9F27'], borderWidth: 0 }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
      }
    }
  }, [activeTab]);

  const handleExport = async () => {
    try {
      addToast('Preparing export…', 'success');
      const res = await fetch('/api/admin/export-csv', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lucky_cart_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast('Database exported successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Export failed.', 'danger');
    }
  };

  const handleApproveReview = async (id) => {
    try {
      await api.put(`/admin/reviews/${id}/approve`, {}, token);
      addToast('Review approved!', 'success');
      // Refresh reviews
      const reviewsData = await api.get('/admin/reviews', token);
      setReviews(reviewsData || []);
    } catch (err) {
      addToast(err.message || 'Failed to approve review', 'danger');
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.delete(`/admin/reviews/${id}`, token);
      addToast('Review deleted!', 'success');
      // Refresh reviews
      const reviewsData = await api.get('/admin/reviews', token);
      setReviews(reviewsData || []);
    } catch (err) {
      addToast(err.message || 'Failed to delete review', 'danger');
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    addToast('Settings saved successfully!', 'success');
  };

  // Product Page specific logic
  const getSoldQty = (prodId) => {
    let totalSold = 0;
    orders.forEach(o => {
      if (o.status !== 'Rejected' && o.status !== 'Cancelled' && o.items) {
        o.items.forEach(oi => {
          if (oi.item && (oi.item._id === prodId || oi.item === prodId)) {
            totalSold += oi.quantity;
          }
        });
      }
    });
    return totalSold;
  };

  const getProductStatus = (p) => {
    if (p.stock === 0) return 'Out of Stock';
    if (p.stock <= 10) return 'Low Stock';
    return 'Active';
  };

  const getStockColor = (p) => {
    if (p.stock === 0) return '#E24B4A';
    if (p.stock <= 10) return '#EF9F27';
    return '#1D9E75';
  };

  const handleSaveStock = async (prodId, newStock) => {
    const val = parseInt(newStock, 10);
    if (isNaN(val) || val < 0) {
      addToast('Please enter a valid stock number', 'danger');
      return;
    }
    try {
      await api.put(`/admin/products/${prodId}/stock`, { stock: val }, token);
      addToast('Stock updated successfully', 'success');
      // Refresh products list
      const productsData = await api.get('/admin/products', token);
      setProducts(productsData || []);
    } catch (err) {
      addToast(err.message || 'Failed to update stock', 'danger');
    }
  };

  const handleDeleteProduct = async (prodId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/admin/products/${prodId}`, token);
      addToast('Product deleted successfully', 'success');
      if (selectedProductId === prodId) {
        setSelectedProductId(null);
      }
      // Refresh products list
      const productsData = await api.get('/admin/products', token);
      setProducts(productsData || []);
    } catch (err) {
      addToast(err.message || 'Failed to delete product', 'danger');
    }
  };

  // Bulk operations
  const toggleSelectAllProducts = (checked) => {
    if (checked) {
      setSelectedProducts(products.map(p => p._id));
    } else {
      setSelectedProducts([]);
    }
  };

  const toggleSelectProduct = (prodId) => {
    if (selectedProducts.includes(prodId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== prodId));
    } else {
      setSelectedProducts([...selectedProducts, prodId]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) return;
    try {
      await Promise.all(selectedProducts.map(id => api.delete(`/admin/products/${id}`, token)));
      addToast('Selected products deleted successfully', 'success');
      setSelectedProducts([]);
      // Refresh products list
      const productsData = await api.get('/admin/products', token);
      setProducts(productsData || []);
    } catch (err) {
      addToast(err.message || 'Failed to delete some products', 'danger');
    }
  };

  const handleExportCsv = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${apiBase}/admin/export-csv`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to download CSV');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lucky_cart_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      addToast('Error downloading export: ' + err.message, 'danger');
    }
  };

  const openDrawer = (p) => {
    setSelectedProductId(p._id);
    setEditingStockVal(p.stock.toString());
  };

  const handlePrevPage = () => {
    if (productsPage > 1) setProductsPage(productsPage - 1);
  };

  const handleNextPage = () => {
    if (productsPage < pagesCount) setProductsPage(productsPage + 1);
  };

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'orders', icon: ClipboardList, label: 'Orders', badge: orders.length },
    { id: 'products', icon: Package, label: 'Products', badge: products.length },
    { id: 'users', icon: Users, label: 'Customers', badge: users.length },
    { id: 'analytics', icon: LineChart, label: 'Analytics' }
  ];

  const sysItems = [
    { id: 'reviews', icon: Star, label: 'Reviews', badge: reviews.filter(r => !r.is_verified).length },
    { id: 'activity', icon: Activity, label: 'Activity' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  // Stats derived
  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'Cancelled' ? o.total_price : 0), 0);
  const totalOrders = orders.length;
  const activeCustomers = users.length;
  const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled' || o.status === 'Rejected').length;
  const processingOrders = orders.filter(o => o.status === 'Processing').length;
  const pendingOrders = totalOrders - deliveredOrders - cancelledOrders - processingOrders;

  // Filter lists
  const filteredOrders = orders.filter(o => {
    const q = orderQuery.toLowerCase();
    return o._id.toLowerCase().includes(q) || (o.user?.username || '').toLowerCase().includes(q);
  });

  const filteredProducts = products.filter(p => {
    const q = productQuery.toLowerCase();
    const matchesQuery = p.name.toLowerCase().includes(q) || 
                         p.barcode.includes(q) || 
                         (p.seller?.username || '').toLowerCase().includes(q) || 
                         (p.category || '').toLowerCase().includes(q);
    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    const status = getProductStatus(p);
    const matchesStatus = selectedStatus ? status.toLowerCase().replace(' ', '') === selectedStatus.toLowerCase().replace(' ', '') : true;
    return matchesQuery && matchesCategory && matchesStatus;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (productSortKey === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (productSortKey === 'price') {
      return a.price - b.price;
    }
    if (productSortKey === 'price-desc') {
      return b.price - a.price;
    }
    if (productSortKey === 'stock') {
      return a.stock - b.stock;
    }
    if (productSortKey === 'stock-desc') {
      return b.stock - a.stock;
    }
    if (productSortKey === 'sold') {
      return getSoldQty(b._id) - getSoldQty(a._id);
    }
    if (productSortKey === 'rating') {
      return (b.average_rating || 0) - (a.average_rating || 0);
    }
    return 0;
  });

  const PER_PAGE = 8;
  const totalProductsCount = sortedProducts.length;
  const pagesCount = Math.max(1, Math.ceil(totalProductsCount / PER_PAGE));
  const currentProductsSlice = sortedProducts.slice((productsPage - 1) * PER_PAGE, productsPage * PER_PAGE);

  const selectedProduct = products.find(x => x._id === selectedProductId);

  const filteredCustomers = users.filter(u => {
    const q = customerQuery.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email_address.toLowerCase().includes(q);
  });

  const filteredReviews = reviews.filter(r => {
    const q = reviewQuery.toLowerCase();
    return (r.user?.username || '').toLowerCase().includes(q) || (r.item?.name || '').toLowerCase().includes(q) || r.comment.toLowerCase().includes(q);
  });

  return (
    <div className="admin-dashboard">
      <div className="shell">
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
        
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="logo">
            <ShoppingCart /> LuckyCart
            <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="nav-section">Main</div>
          {navItems.map(item => (
            <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}>
              <item.icon /> {item.label}
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </div>
          ))}
          <div className="nav-section" style={{ marginTop: 8 }}>System</div>
          {sysItems.map(item => (
            <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}>
              <item.icon /> {item.label}
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </div>
          ))}
          <div style={{ flex: 1 }}></div>
          <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
            <div className="user-row">
              <div className="user-avatar u-a" style={{ width: 32, height: 32, fontSize: 12 }}>AD</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Admin User</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Superadmin</div>
              </div>
              <LogOut onClick={logout} style={{ fontSize: 15, color: 'var(--color-text-tertiary)', cursor: 'pointer' }} aria-label="Sign out" />
            </div>
          </div>
        </div>

        <div className="main">
          <div className="mobile-header">
            <button className="menu-toggle-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="mobile-logo"><ShoppingCart size={16} /> LuckyCart</div>
            <div className="mobile-avatar">AD</div>
          </div>
          {/* OVERVIEW PAGE */}
          {activeTab === 'overview' && (
            <div className="page active">
              <div className="topbar">
                <div className="page-title">Overview</div>
                <div className="topbar-right">
                  <div className="topbar-btn"><Calendar /> Jun 2026</div>
                  <div className="topbar-btn" onClick={handleExport}><Download /> Export</div>
                  <div className="avatar">AD</div>
                </div>
              </div>
              <div className="metrics">
                <div className="metric-card">
                  <div className="metric-label"><IndianRupee /> Total Revenue</div>
                  <div className="metric-value">₹{totalRevenue.toLocaleString()}</div>
                  <div className="metric-delta delta-up"><TrendingUp /> +18.4% vs last month</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label"><ClipboardList /> Total Orders</div>
                  <div className="metric-value">{totalOrders.toLocaleString()}</div>
                  <div className="metric-delta delta-up"><TrendingUp /> +9.2% vs last month</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label"><Users /> Active Customers</div>
                  <div className="metric-value">{activeCustomers.toLocaleString()}</div>
                  <div className="metric-delta delta-up"><TrendingUp /> +5.1% vs last month</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label"><RefreshCw /> Return Rate</div>
                  <div className="metric-value">3.2%</div>
                  <div className="metric-delta delta-down"><TrendingDown /> +0.4% vs last month</div>
                </div>
              </div>

              <div className="row2">
                <div className="card">
                  <div className="card-title">Revenue — last 7 days <span className="card-title-sub">Daily breakdown</span></div>
                  <div style={{ position: 'relative', height: 180 }}><canvas ref={revChartRef}></canvas></div>
                </div>
                <div className="card">
                  <div className="card-title">Orders by status</div>
                  <div className="donut-wrap" style={{ height: 160 }}>
                    <canvas ref={donutChartRef} width="160" height="160"></canvas>
                    <div className="donut-center"><div className="donut-center-val">{totalOrders}</div><div className="donut-center-label">orders</div></div>
                  </div>
                  <div className="legend-row">
                    <div className="legend-item"><span className="legend-dot" style={{ background: '#1D9E75' }}></span>Delivered</div>
                    <div className="legend-item"><span className="legend-dot" style={{ background: '#378ADD' }}></span>Processing</div>
                    <div className="legend-item"><span className="legend-dot" style={{ background: '#EF9F27' }}></span>Pending</div>
                    <div className="legend-item"><span className="legend-dot" style={{ background: '#E24B4A' }}></span>Cancelled</div>
                  </div>
                </div>
              </div>

              <div className="row3">
                <div className="card">
                  <div className="card-title">Top products <span className="card-title-sub">by revenue</span></div>
                  <div className="table-responsive">
                    <table>
                      <thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
                      <tbody>
                        <tr><td>Sony WH-1000XM5</td><td>142</td><td>₹2,13,000</td></tr>
                        <tr><td>iPhone 15 Pro Case</td><td>389</td><td>₹58,350</td></tr>
                        <tr><td>Samsung 65" QLED</td><td>28</td><td>₹50,400</td></tr>
                        <tr><td>OnePlus Buds 3</td><td>220</td><td>₹43,780</td></tr>
                        <tr><td>Boat Rockerz 550</td><td>310</td><td>₹37,200</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">Recent Real Orders</div>
                  {loading ? <p>Loading...</p> : (
                    <div className="table-responsive">
                      <table>
                        <thead><tr><th>Customer</th><th>Total</th><th>Date</th></tr></thead>
                        <tbody>
                          {orders.slice(0, 5).map(o => (
                            <tr key={o._id}>
                              <td>
                                <div className="user-row">
                                  <div className="user-avatar u-b" style={{ width: 24, height: 24, fontSize: 10 }}>
                                    {o.user?.username?.[0]?.toUpperCase() || 'U'}
                                  </div>
                                  {o.user?.username || 'Guest'}
                                </div>
                              </td>
                              <td>₹{o.total_price.toLocaleString()}</td>
                              <td style={{ fontSize: 10 }}>{new Date(o.date_ordered).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ORDERS PAGE */}
          {activeTab === 'orders' && (
            <div className="page active">
              <div className="topbar">
                <div className="page-title">Orders</div>
                <div className="topbar-right"><div className="topbar-btn" onClick={handleExport}><Download /> Export CSV</div></div>
              </div>
              <div className="metrics" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                <div className="metric-card"><div className="metric-label">Pending</div><div className="metric-value" style={{ color: 'var(--color-text-warning)' }}>{pendingOrders}</div></div>
                <div className="metric-card"><div className="metric-label">Processing</div><div className="metric-value" style={{ color: 'var(--color-text-info)' }}>{processingOrders}</div></div>
                <div className="metric-card"><div className="metric-label">Delivered</div><div className="metric-value" style={{ color: 'var(--color-text-success)' }}>{deliveredOrders}</div></div>
                <div className="metric-card"><div className="metric-label">Cancelled</div><div className="metric-value" style={{ color: 'var(--color-text-danger)' }}>{cancelledOrders}</div></div>
              </div>
              <div className="full-card">
                <div className="search-bar"><Search /><input value={orderQuery} onChange={e => setOrderQuery(e.target.value)} placeholder="Search by order ID, customer…" /></div>
                {loading ? <p>Loading orders...</p> : (
                  <div className="table-responsive">
                    <table>
                      <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                      <tbody>
                        {filteredOrders.map(o => (
                          <tr key={o._id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>#LC-{o._id.slice(-8).toUpperCase()}</td>
                            <td>
                              <div className="user-row">
                                <div className="user-avatar u-c" style={{ width: 24, height: 24, fontSize: 10 }}>
                                  {o.user?.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                {o.user?.username || 'Guest'}
                              </div>
                            </td>
                            <td>₹{o.total_price.toLocaleString()}</td>
                            <td>
                              <span className={`badge ${o.status === 'Delivered' ? 'badge-success' : o.status === 'Cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                                {o.status}
                              </span>
                            </td>
                            <td style={{ fontSize: 11 }}>{new Date(o.date_ordered).toLocaleDateString()}</td>
                            <td><button className="act-btn"><Eye /> View</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRODUCTS PAGE */}
          {activeTab === 'products' && (
            <div className="page active">
              <div className="topbar">
                <div>
                  <div className="page-title" style={{ fontWeight: 600, fontSize: 18 }}>Products</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    Manage your entire catalog — stock, pricing, visibility
                  </div>
                </div>
                <div className="topbar-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn" onClick={handleExportCsv} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Download size={14} /> Export CSV
                  </button>
                  {selectedProducts.length > 0 && (
                    <button className="btn" style={{ color: 'var(--color-text-danger)', borderColor: 'var(--color-border-danger)', display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={handleBulkDelete}>
                      <Trash2 size={14} /> Delete ({selectedProducts.length})
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={() => addToast('Please add products from the Listings / Seller portal', 'info')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--color-background-info)', color: 'var(--color-text-info)' }}>
                    <Plus size={14} /> Add product
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="metrics" style={{ gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 18 }}>
                <div className="metric-card" style={{ padding: '10px 12px' }}>
                  <div className="metric-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}><Package size={12} /> Total</div>
                  <div className="metric-value" style={{ fontSize: 18 }}>{products.length}</div>
                </div>
                <div className="metric-card" style={{ padding: '10px 12px' }}>
                  <div className="metric-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}><Check size={12} /> Active</div>
                  <div className="metric-value" style={{ fontSize: 18, color: 'var(--color-text-success)' }}>
                    {products.filter(p => p.stock > 10).length}
                  </div>
                </div>
                <div className="metric-card" style={{ padding: '10px 12px' }}>
                  <div className="metric-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}><Activity size={12} /> Low Stock</div>
                  <div className="metric-value" style={{ fontSize: 18, color: 'var(--color-text-warning)' }}>
                    {products.filter(p => p.stock > 0 && p.stock <= 10).length}
                  </div>
                </div>
                <div className="metric-card" style={{ padding: '10px 12px' }}>
                  <div className="metric-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}><X size={12} /> Out of Stock</div>
                  <div className="metric-value" style={{ fontSize: 18, color: 'var(--color-text-danger)' }}>
                    {products.filter(p => p.stock === 0).length}
                  </div>
                </div>
                <div className="metric-card" style={{ padding: '10px 12px' }}>
                  <div className="metric-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}><IndianRupee size={12} /> Revenue</div>
                  <div className="metric-value" style={{ fontSize: 18 }}>
                    ₹{(products.reduce((sum, p) => sum + p.price * getSoldQty(p._id), 0) / 1000).toFixed(1)}K
                  </div>
                </div>
                <div className="metric-card" style={{ padding: '10px 12px' }}>
                  <div className="metric-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}><Star size={12} /> Avg Rating</div>
                  <div className="metric-value" style={{ fontSize: 18 }}>
                    {(products.reduce((sum, p) => sum + (p.average_rating || 0), 0) / (products.length || 1)).toFixed(1)} ★
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="toolbar">
                <div className="search-wrap">
                  <Search size={14} />
                  <input
                    value={productQuery}
                    onChange={(e) => {
                      setProductQuery(e.target.value);
                      setProductsPage(1);
                    }}
                    placeholder="Search by name, barcode, seller, category…"
                  />
                </div>
                <select
                  className="toolbar-select"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setProductsPage(1);
                  }}
                >
                  <option value="">All categories</option>
                  {[...new Set(products.map(p => p.category))].filter(Boolean).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  className="toolbar-select"
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setProductsPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="lowstock">Low stock</option>
                  <option value="outofstock">Out of stock</option>
                </select>
                <select
                  className="toolbar-select"
                  value={productSortKey}
                  onChange={(e) => {
                    setProductSortKey(e.target.value);
                    setProductsPage(1);
                  }}
                >
                  <option value="name">Sort: Name</option>
                  <option value="price">Sort: Price ↑</option>
                  <option value="price-desc">Sort: Price ↓</option>
                  <option value="stock">Sort: Stock ↑</option>
                  <option value="stock-desc">Sort: Stock ↓</option>
                  <option value="sold">Sort: Best Selling</option>
                  <option value="rating">Sort: Rating</option>
                </select>
                <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                  <div className={`chip ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
                    <Table size={12} /> Table
                  </div>
                  <div className={`chip ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                    <LayoutGrid size={12} /> Grid
                  </div>
                </div>
              </div>

              {/* Table / Grid view */}
              <div className="table-card">
                {loading ? (
                  <p style={{ padding: 20 }}>Loading products...</p>
                ) : viewMode === 'table' ? (
                  <div id="table-view" style={{ overflowX: 'auto' }}>
                    <table className="tbl" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 40, paddingLeft: 12 }}>
                            <input
                              type="checkbox"
                              checked={products.length > 0 && selectedProducts.length === products.length}
                              onChange={(e) => toggleSelectAllProducts(e.target.checked)}
                            />
                          </th>
                          <th style={{ width: 200 }}>Product</th>
                          <th style={{ width: 100 }}>Barcode</th>
                          <th style={{ width: 100 }}>Category</th>
                          <th style={{ width: 80 }}>Price</th>
                          <th style={{ width: 90 }}>Stock</th>
                          <th style={{ width: 60 }}>Sold</th>
                          <th style={{ width: 80 }}>Revenue</th>
                          <th style={{ width: 90 }}>Seller</th>
                          <th style={{ width: 70 }}>Rating</th>
                          <th style={{ width: 90 }}>Status</th>
                          <th style={{ width: 100, paddingRight: 12 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentProductsSlice.map((p) => {
                          const status = getProductStatus(p);
                          const isSelected = selectedProducts.includes(p._id);
                          return (
                            <tr
                              key={p._id}
                              className={isSelected ? 'selected' : ''}
                            >
                              <td style={{ paddingLeft: 12 }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectProduct(p._id)}
                                />
                              </td>
                              <td onClick={() => navigate(`/item/${p._id}`)} style={{ cursor: 'pointer' }}>
                                <div className="prod-cell">
                                  <div className="prod-avatar" style={{ background: 'rgba(55, 138, 221, 0.15)', color: '#63b3ed' }}>
                                    {p.name[0]?.toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="prod-name" title={p.name}>{p.name}</div>
                                    <div className="prod-sub" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                                      {p.description ? p.description.substring(0, 24) + '…' : ''}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{p.barcode}</td>
                              <td><span className="badge badge-gray">{p.category}</span></td>
                              <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>₹{p.price.toLocaleString()}</td>
                              <td>
                                <div style={{ fontSize: 12, fontWeight: 500, color: getStockColor(p) }}>{p.stock}</div>
                                <div className="stock-bar">
                                  <div className="stock-fill" style={{ width: `${Math.min(100, Math.round((p.stock / 50) * 100))}%`, background: getStockColor(p) }}></div>
                                </div>
                              </td>
                              <td>{getSoldQty(p._id)}</td>
                              <td>₹{(p.price * getSoldQty(p._id)).toLocaleString()}</td>
                              <td>{p.seller?.username || 'System'}</td>
                              <td>
                                <Star size={12} style={{ display: 'inline', color: '#EF9F27', marginRight: 4, fill: '#EF9F27' }} />
                                <span className="star-val">{p.average_rating ? p.average_rating.toFixed(1) : 'N/A'}</span>
                              </td>
                              <td>
                                <span className={`badge ${status === 'Active' ? 'b-success' : status === 'Low Stock' ? 'b-warning' : 'b-danger'}`}>
                                  {status}
                                </span>
                              </td>
                              <td style={{ paddingRight: 12 }}>
                                <div className="act-wrap">
                                  <button className="icon-btn" title="View details" onClick={() => openDrawer(p)}>
                                    <Eye size={14} />
                                  </button>
                                  <button className="icon-btn" title="Edit product" onClick={() => navigate(`/item/${p._id}`)}>
                                    <Edit size={14} />
                                  </button>
                                  <button className="icon-btn danger" title="Delete product" onClick={() => handleDeleteProduct(p._id)}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div id="grid-view" style={{ padding: 14 }}>
                    <div id="grid-inner" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                      {currentProductsSlice.map((p) => {
                        const status = getProductStatus(p);
                        return (
                          <div
                            key={p._id}
                            style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 12, cursor: 'pointer' }}
                            onClick={() => navigate(`/item/${p._id}`)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <div className="prod-avatar" style={{ background: 'rgba(55, 138, 221, 0.15)', color: '#63b3ed', width: 32, height: 32 }}>
                                {p.name[0]?.toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }} title={p.name}>
                                  {p.name}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{p.category}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>₹{p.price.toLocaleString()}</span>
                              <span className={`badge ${status === 'Active' ? 'b-success' : status === 'Low Stock' ? 'b-warning' : 'b-danger'}`}>
                                {status}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                              {getSoldQty(p._id)} sold &nbsp;·&nbsp; <Star size={11} style={{ display: 'inline', color: '#EF9F27', fill: '#EF9F27', verticalAlign: 'middle', marginRight: 2 }} />
                              <span style={{ color: '#BA7517', fontWeight: 500 }}>{p.average_rating ? p.average_rating.toFixed(1) : 'N/A'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pagination */}
                <div className="pagination">
                  <span>
                    Showing {Math.min((productsPage - 1) * PER_PAGE + 1, totalProductsCount)}–{Math.min(productsPage * PER_PAGE, totalProductsCount)} of {totalProductsCount} products
                  </span>
                  <div className="page-btns">
                    <button className="page-btn" onClick={handlePrevPage} disabled={productsPage === 1} style={{ cursor: productsPage === 1 ? 'not-allowed' : 'pointer', opacity: productsPage === 1 ? 0.4 : 1 }}>
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: pagesCount }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={pg}
                        className={`page-btn ${productsPage === pg ? 'active' : ''}`}
                        onClick={() => setProductsPage(pg)}
                      >
                        {pg}
                      </button>
                    ))}
                    <button className="page-btn" onClick={handleNextPage} disabled={productsPage === pagesCount} style={{ cursor: productsPage === pagesCount ? 'not-allowed' : 'pointer', opacity: productsPage === pagesCount ? 0.4 : 1 }}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* USERS PAGE */}
          {activeTab === 'users' && (
            <div className="page active">
              <div className="topbar">
                <div className="page-title">Customers</div>
                <div className="topbar-right"><div className="topbar-btn" onClick={handleExport}><Download /> Export</div></div>
              </div>
              <div className="metrics" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                <div className="metric-card"><div className="metric-label">Total customers</div><div className="metric-value">{users.length}</div></div>
                <div className="metric-card"><div className="metric-label">Buyers</div><div className="metric-value">{users.filter(u => u.role !== 'seller').length}</div></div>
                <div className="metric-card"><div className="metric-label">Sellers</div><div className="metric-value">{users.filter(u => u.role === 'seller').length}</div></div>
                <div className="metric-card"><div className="metric-label">Avg. budget</div><div className="metric-value">₹12,400</div></div>
              </div>
              <div className="full-card">
                <div className="search-bar"><Search /><input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)} placeholder="Search by name, email, username…" /></div>
                {loading ? <p>Loading users...</p> : (
                  <div className="table-responsive">
                    <table>
                      <thead><tr><th>Customer</th><th>Email</th><th>Role</th><th>Budget</th><th>Joined</th><th>Status</th></tr></thead>
                      <tbody>
                        {filteredCustomers.map(u => (
                          <tr key={u._id}>
                            <td>
                              <div className="user-row">
                                <div className="user-avatar u-e" style={{ width: 28, height: 28, fontSize: 11 }}>
                                  {u.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 500 }}>{u.full_name || u.username}</div>
                                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{u.username}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontSize: 11 }}>{u.email_address}</td>
                            <td>
                              <span className={`badge ${u.role === 'seller' ? 'badge-warning' : 'badge-info'}`}>
                                {u.role === 'seller' ? 'Seller' : 'Buyer'}
                              </span>
                            </td>
                            <td>₹{u.budget?.toLocaleString()}</td>
                            <td style={{ fontSize: 11 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td><span className="badge badge-success">Active</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANALYTICS PAGE */}
          {activeTab === 'analytics' && (
            <div className="page active">
              <div className="topbar">
                <div className="page-title">Analytics</div>
                <div className="topbar-right"><div className="topbar-btn"><Calendar /> Last 30 days</div></div>
              </div>
              <div className="row2">
                <div className="card">
                  <div className="card-title">Revenue trend — 6 months <span className="card-title-sub">Monthly</span></div>
                  <div style={{ position: 'relative', height: 200 }}><canvas ref={trendChartRef}></canvas></div>
                </div>
                <div className="card">
                  <div className="card-title">Sales by category</div>
                  <div style={{ position: 'relative', height: 200 }}><canvas ref={catChartRef}></canvas></div>
                </div>
              </div>
              <div className="row3">
                <div className="card">
                  <div className="card-title">Payment methods</div>
                  <div style={{ position: 'relative', height: 200 }}><canvas ref={payChartRef}></canvas></div>
                </div>
              </div>
            </div>
          )}

          {/* REVIEWS PAGE */}
          {activeTab === 'reviews' && (
            <div className="page active">
              <div className="topbar"><div className="page-title">Reviews</div></div>
              <div className="metrics" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                <div className="metric-card"><div className="metric-label">Total reviews</div><div className="metric-value">{reviews.length}</div></div>
                <div className="metric-card">
                  <div className="metric-label">Avg. rating</div>
                  <div className="metric-value">
                    {(reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1)).toFixed(1)} ★
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Pending moderation</div>
                  <div className="metric-value" style={{ color: 'var(--color-text-warning)' }}>
                    {reviews.filter(r => !r.is_verified).length}
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Approved</div>
                  <div className="metric-value" style={{ color: 'var(--color-text-success)' }}>
                    {reviews.filter(r => r.is_verified).length}
                  </div>
                </div>
              </div>
              <div className="full-card">
                <div className="search-bar"><Search /><input value={reviewQuery} onChange={e => setReviewQuery(e.target.value)} placeholder="Search by customer, product, comment…" /></div>
                {loading ? <p>Loading reviews...</p> : (
                  <div className="table-responsive">
                    <table>
                      <thead><tr><th>Customer</th><th>Product</th><th>Rating</th><th>Review</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
                      <tbody>
                        {filteredReviews.map(r => (
                          <tr key={r._id}>
                            <td>
                              <div className="user-row">
                                <div className="user-avatar u-b" style={{ width: 24, height: 24, fontSize: 10 }}>
                                  {r.user?.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                {r.user?.username || 'Guest'}
                              </div>
                            </td>
                            <td style={{ fontSize: 11, maxWidth: 120 }}>{r.item?.name || 'Item'}</td>
                            <td>
                              <span style={{ color: 'var(--color-text-warning)' }}>
                                {'★'.repeat(r.rating)}
                              </span>
                              <span style={{ color: 'var(--color-text-tertiary)' }}>
                                {'★'.repeat(5 - r.rating)}
                              </span>
                            </td>
                            <td style={{ fontSize: 11, maxWidth: 160, color: 'var(--color-text-secondary)' }}>{r.comment}</td>
                            <td style={{ fontSize: 11 }}>{new Date(r.createdAt || r.date_posted).toLocaleDateString()}</td>
                            <td>
                              <span className={`badge ${r.is_verified ? 'badge-success' : 'badge-warning'}`}>
                                {r.is_verified ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {!r.is_verified && (
                                  <button className="act-btn" onClick={() => handleApproveReview(r._id)}>
                                    <Check size={12} /> Approve
                                  </button>
                                )}
                                <button className="act-btn" style={{ color: 'var(--color-text-danger)' }} onClick={() => handleDeleteReview(r._id)}>
                                  <Trash size={12} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVITY PAGE */}
          {activeTab === 'activity' && (
            <div className="page active">
              <div className="topbar"><div className="page-title">Activity Log</div></div>
              <div className="full-card">
                {loading ? <p>Loading activity logs...</p> : (
                  <div className="timeline" style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingLeft: 24 }}>
                    <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 1, background: 'var(--color-border-tertiary)' }}></div>
                    {activity.map((act, index) => {
                      let dotBg = 'var(--color-text-info)';
                      if (act.type === 'order') dotBg = 'var(--color-text-success)';
                      if (act.type === 'user') dotBg = 'var(--color-text-warning)';
                      if (act.type === 'review') dotBg = 'var(--color-text-danger)';
                      
                      const timeDiff = new Date() - new Date(act.time);
                      const minutes = Math.floor(timeDiff / 60000);
                      let timeStr = 'Just now';
                      if (minutes > 0 && minutes < 60) timeStr = `${minutes}m ago`;
                      else if (minutes >= 60 && minutes < 1440) timeStr = `${Math.floor(minutes / 60)}h ago`;
                      else if (minutes >= 1440) timeStr = new Date(act.time).toLocaleDateString();

                      return (
                        <div key={index} className="timeline-item" style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: -24, top: 2, width: 11, height: 11, borderRadius: '50%', background: dotBg, border: '2px solid var(--color-background-primary)', display: 'inline-block' }}></span>
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{act.title}</div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{timeStr}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SETTINGS PAGE */}
          {activeTab === 'settings' && (
            <div className="page active">
              <div className="topbar"><div className="page-title">Settings</div></div>
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="row2">
                  <div className="card">
                    <div className="card-title">Store information</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>Store Name</label>
                        <input className="search-bar" style={{ margin: '4px 0 0', width: '100%', padding: '8px 12px' }} value={storeName} onChange={e => setStoreName(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>Support Email</label>
                        <input className="search-bar" style={{ margin: '4px 0 0', width: '100%', padding: '8px 12px' }} value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-title">Shipping partners</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12 }}>Delhivery Courier</span>
                        <span className="badge badge-success">Active</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12 }}>BlueDart Express</span>
                        <span className="badge badge-success">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row2">
                  <div className="card">
                    <div className="card-title">Localization</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>Currency Symbol</label>
                        <input className="search-bar" style={{ margin: '4px 0 0', width: '100%', padding: '8px 12px' }} value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button type="submit" className="topbar-btn" style={{ background: 'var(--color-text-info)', color: '#ffffff', borderColor: 'transparent', padding: '10px 24px', cursor: 'pointer' }}>
                      Save Settings
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* PRODUCT DETAIL DRAWER */}
          {selectedProduct && (
            <div className="drawer-overlay" onClick={() => setSelectedProductId(null)}>
              <div className="drawer" onClick={(e) => e.stopPropagation()}>
                <div className="drawer-header">
                  <div>
                    <h3 className="drawer-title" style={{ wordBreak: 'break-word', maxWidth: 260 }}>{selectedProduct.name}</h3>
                    <div className="drawer-sub">{selectedProduct.barcode} &nbsp;·&nbsp; {selectedProduct.category}</div>
                  </div>
                  <button className="icon-btn" onClick={() => setSelectedProductId(null)}>
                    <X size={16} />
                  </button>
                </div>

                <div className="d-section">
                  <div className="d-section-title">Inventory Control</div>
                  <div className="inline-edit" style={{ marginTop: 8 }}>
                    <input
                      type="number"
                      value={editingStockVal}
                      onChange={(e) => setEditingStockVal(e.target.value)}
                      placeholder="Stock"
                      min="0"
                    />
                    <button className="inline-save" onClick={() => handleSaveStock(selectedProduct._id, editingStockVal)}>
                      Save Stock
                    </button>
                  </div>
                </div>

                <div className="d-section">
                  <div className="d-section-title">Sales Metrics</div>
                  <div className="d-row">
                    <span className="d-label">Unit Price</span>
                    <span className="d-val">₹{selectedProduct.price.toLocaleString()}</span>
                  </div>
                  <div className="d-row">
                    <span className="d-label">Current Stock</span>
                    <span className="d-val" style={{ color: getStockColor(selectedProduct) }}>{selectedProduct.stock} units</span>
                  </div>
                  <div className="d-row">
                    <span className="d-label">Units Sold</span>
                    <span className="d-val">{getSoldQty(selectedProduct._id)} units</span>
                  </div>
                  <div className="d-row">
                    <span className="d-label">Total Revenue</span>
                    <span className="d-val">₹{(selectedProduct.price * getSoldQty(selectedProduct._id)).toLocaleString()}</span>
                  </div>
                  
                  <div style={{ marginTop: 10 }}>
                    <span className="d-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Sales Velocity</span>
                    <div className="sparkline">
                      {[12, 18, 15, 24, 20, 30, 25].map((val, idx) => (
                        <div
                          key={idx}
                          className="spark-b"
                          style={{
                            height: `${(val / 30) * 100}%`,
                            background: idx === 6 ? 'var(--color-text-info)' : 'var(--color-text-tertiary)',
                            opacity: 0.6 + (idx * 0.06)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="d-section">
                  <div className="d-section-title">Listing Info</div>
                  <div className="d-row">
                    <span className="d-label">Seller</span>
                    <span className="d-val">{selectedProduct.seller?.username || 'System'}</span>
                  </div>
                  <div className="d-row">
                    <span className="d-label">Category</span>
                    <span className="d-val">{selectedProduct.category}</span>
                  </div>
                  <div className="d-row">
                    <span className="d-label">Rating</span>
                    <span className="d-val">
                      <Star size={12} style={{ display: 'inline', color: '#EF9F27', fill: '#EF9F27', marginRight: 4 }} />
                      {selectedProduct.average_rating ? selectedProduct.average_rating.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="d-row">
                    <span className="d-label">Status</span>
                    <span className="d-val">
                      <span className={`badge ${getProductStatus(selectedProduct) === 'Active' ? 'b-success' : getProductStatus(selectedProduct) === 'Low Stock' ? 'b-warning' : 'b-danger'}`}>
                        {getProductStatus(selectedProduct)}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="d-section" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
                  <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate(`/item/${selectedProduct._id}`)}>
                    <Edit size={14} style={{ marginRight: 6 }} /> Edit Listing Details
                  </button>
                  <button
                    className="btn"
                    style={{ width: '100%', justifyContent: 'center', color: 'var(--color-text-warning)', borderColor: 'var(--color-border-warning)' }}
                    onClick={async () => {
                      try {
                        await api.put(`/admin/products/${selectedProduct._id}/stock`, { stock: 0 }, token);
                        addToast('Product de-activated (stock set to 0)', 'warning');
                        setSelectedProductId(null);
                        const productsData = await api.get('/admin/products', token);
                        setProducts(productsData || []);
                      } catch (err) {
                        addToast(err.message || 'Deactivation failed', 'danger');
                      }
                    }}
                  >
                    Deactivate Listing
                  </button>
                  <button
                    className="btn"
                    style={{ width: '100%', justifyContent: 'center', color: 'var(--color-text-danger)', borderColor: 'var(--color-border-danger)' }}
                    onClick={() => handleDeleteProduct(selectedProduct._id)}
                  >
                    <Trash2 size={14} style={{ marginRight: 6 }} /> Delete Listing
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
