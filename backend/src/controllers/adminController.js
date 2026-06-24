import { Order, Item, User, Review } from '../models/index.js';

// Get all orders on the platform (Admin dashboard)
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

// ─── Helper: escape a CSV field ──────────────────────────────────────────────
const esc = (val) => {
  if (val == null) return '""';
  return `"${String(val).replace(/"/g, '""')}"`;
};

// Export all system data as a single comprehensive CSV file
export const exportDataCsv = async (req, res) => {
  try {
    const [items, users, orders, reviews] = await Promise.all([
      Item.find().populate('seller', 'username'),
      User.find().select('-password_hash'),
      Order.find().populate('user', 'username email_address').sort({ date_ordered: -1 }),
      Review.find().populate('user', 'username').populate('item', 'name')
    ]);

    // BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    let csvContent = BOM;

    // ── 1. Items ────────────────────────────────────────────────────────────
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

    // ── 2. Users ────────────────────────────────────────────────────────────
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

    // ── 3. Orders ───────────────────────────────────────────────────────────
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

    // ── 4. Reviews ──────────────────────────────────────────────────────────
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

    // Summary footer
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
