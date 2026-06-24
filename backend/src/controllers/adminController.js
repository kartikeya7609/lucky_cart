import { Order, Item, User, Review } from '../models/index.js';


export const getAdminUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password_hash').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving admin users' });
  }
};


export const getAdminProducts = async (req, res) => {
  try {
    const items = await Item.find().populate('seller', 'username');
    res.status(200).json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving admin products' });
  }
};


export const getAdminReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'username')
      .populate('item', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving admin reviews' });
  }
};


export const approveReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    review.is_verified = true;
    await review.save();
    res.status(200).json({ message: 'Review approved successfully', review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error approving review' });
  }
};


export const adminDeleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting review' });
  }
};


export const getAdminActivity = async (req, res) => {
  try {
    const [orders, users, items, reviews] = await Promise.all([
      Order.find().populate('user', 'username').sort({ createdAt: -1 }).limit(10),
      User.find().sort({ createdAt: -1 }).limit(10),
      Item.find().populate('seller', 'username').sort({ createdAt: -1 }).limit(10),
      Review.find().populate('user', 'username').populate('item', 'name').sort({ createdAt: -1 }).limit(10)
    ]);

    const activities = [];

    orders.forEach(o => {
      activities.push({
        type: 'order',
        title: `New order #LC-${o._id.toString().slice(-8).toUpperCase()} placed by ${o.user?.username || 'Guest'} — ₹${o.total_price.toLocaleString()}`,
        time: o.createdAt || o.date_ordered,
        user: o.user?.username || 'Guest'
      });
    });

    users.forEach(u => {
      activities.push({
        type: 'user',
        title: `New customer registered — ${u.email_address}`,
        time: u.createdAt,
        user: u.username
      });
    });

    items.forEach(i => {
      activities.push({
        type: 'item',
        title: `New product listed: ${i.name} — ₹${i.price.toLocaleString()}`,
        time: i.createdAt,
        user: i.seller?.username || 'Seller'
      });
    });

    reviews.forEach(r => {
      activities.push({
        type: 'review',
        title: `New ${r.rating}★ review on '${r.item?.name || 'Item'}' by ${r.user?.username || 'Guest'}`,
        time: r.createdAt || r.date_posted,
        user: r.user?.username || 'Guest'
      });
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.status(200).json(activities.slice(0, 25));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving admin activities' });
  }
};
export const getAdminOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username email_address')
      .populate('address')
      .populate({
        path: 'items',
        populate: { path: 'item' }
      })
      .sort({ date_ordered: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving admin orders' });
  }
};


const esc = (val) => {
  if (val == null) return '""';
  return `"${String(val).replace(/"/g, '""')}"`;
};


export const exportDataCsv = async (req, res) => {
  try {
    const [items, users, orders, reviews] = await Promise.all([
      Item.find().populate('seller', 'username'),
      User.find().select('-password_hash'),
      Order.find().populate('user', 'username email_address').sort({ date_ordered: -1 }),
      Review.find().populate('user', 'username').populate('item', 'name')
    ]);

    
    const BOM = '\uFEFF';
    let csvContent = BOM;

    
    csvContent += '=== ITEMS ===\n';
    csvContent += 'ID,Name,Category,Price (INR),Stock,Barcode,Seller Username,Seller ID\n';
    for (const item of items) {
      csvContent += [
        esc(item._id),
        esc(item.name),
        esc(item.category),
        item.price,
        item.stock,
        esc(item.barcode),
        esc(item.seller?.username || ''),
        esc(item.seller?._id || '')
      ].join(',') + '\n';
    }

    csvContent += '\n';

    
    csvContent += '=== USERS ===\n';
    csvContent += 'ID,Username,Email,Role,Budget (INR),Joined\n';
    for (const u of users) {
      csvContent += [
        esc(u._id),
        esc(u.username),
        esc(u.email_address),
        esc(u.role),
        u.budget != null ? u.budget.toFixed(2) : '0.00',
        esc(u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '')
      ].join(',') + '\n';
    }

    csvContent += '\n';

    
    csvContent += '=== ORDERS ===\n';
    csvContent += 'Order ID,Username,Email,Total (INR),Status,Date Ordered,Date Delivered,Return Reason\n';
    for (const o of orders) {
      csvContent += [
        esc(`#LC-${String(o._id).slice(-8).toUpperCase()}`),
        esc(o.user?.username || ''),
        esc(o.user?.email_address || ''),
        o.total_price != null ? o.total_price.toFixed(2) : '0.00',
        esc(o.status),
        esc(o.date_ordered ? new Date(o.date_ordered).toLocaleDateString('en-IN') : ''),
        esc(o.date_delivered ? new Date(o.date_delivered).toLocaleDateString('en-IN') : ''),
        esc(o.return_reason || '')
      ].join(',') + '\n';
    }

    csvContent += '\n';

    
    csvContent += '=== REVIEWS ===\n';
    csvContent += 'Review ID,Username,Item Name,Rating,Comment,Verified,Date Posted\n';
    for (const r of reviews) {
      csvContent += [
        esc(r._id),
        esc(r.user?.username || ''),
        esc(r.item?.name || ''),
        r.rating,
        esc(r.comment),
        r.is_verified ? 'Yes' : 'No',
        esc(r.date_posted ? new Date(r.date_posted).toLocaleDateString('en-IN') : '')
      ].join(',') + '\n';
    }

    
    csvContent += `\n=== SUMMARY ===\n`;
    csvContent += `Items,${items.length}\n`;
    csvContent += `Users,${users.length}\n`;
    csvContent += `Orders,${orders.length}\n`;
    csvContent += `Reviews,${reviews.length}\n`;
    csvContent += `Exported At,${new Date().toLocaleString('en-IN')}\n`;

    const filename = `lucky_cart_export_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error exporting data CSV' });
  }
};


export const updateAdminProductStock = async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock == null || isNaN(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({ message: 'Valid stock number is required' });
    }
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Product not found' });
    item.stock = Number(stock);
    await item.save();

    const updatedItem = await Item.findById(req.params.id).populate('seller', 'username');
    res.status(200).json({ message: 'Stock updated successfully', item: updatedItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating stock' });
  }
};


export const deleteAdminProduct = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting product' });
  }
};
