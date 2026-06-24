import { Order, OrderItem, Item, User, Address, Wishlist, WishlistItem, Notification, ViewedItem } from '../models/index.js';
import mongoose from 'mongoose';


export const getMyOrders = async (req, res) => {
  const userId = req.user.id;

  try {
    const orders = await Order.find({ user: userId })
      .populate('address')
      .populate({
        path: 'items',
        populate: { path: 'item' }
      })
      .sort({ date_ordered: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving orders' });
  }
};


export const getSellerOrders = async (req, res) => {
  const sellerId = req.user.id;

  try {
    
    const sellerItems = await Item.find({ seller: sellerId }).select('_id').lean();
    const sellerItemIds = sellerItems.map(i => i._id);

    
    const orderItems = await OrderItem.find({ item: { $in: sellerItemIds } }).select('order').lean();

    
    const orderIds = [...new Set(orderItems.map(oi => String(oi.order)))];

    
    const orders = await Order.find({ _id: { $in: orderIds } })
      .populate('user', 'username email_address full_name phone_number')
      .populate('address')
      .populate({
        path: 'items',
        populate: { path: 'item' }
      })
      .sort({ date_ordered: -1 })
      .lean();

    
    const enriched = orders.map(order => {
      const myItems = (order.items || []).filter(
        oi => oi.item && String(oi.item.seller) === String(sellerId)
      );
      const myEarnings = myItems.reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
      const refunded = ['Cancelled', 'Rejected'].includes(order.status) ? myEarnings : 0;

      return {
        ...order,
        myItems,
        myEarnings,
        refunded
      };
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving seller orders' });
  }
};


export const getReceipt = async (req, res) => {
  const orderId = req.params.orderId;
  const userId = req.user.id;

  try {
    const order = await Order.findById(orderId)
      .populate('user', 'username email_address')
      .populate('address')
      .populate({
        path: 'items',
        populate: { path: 'item' }
      });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    
    if (String(order.user._id) !== String(userId)) {
      return res.status(403).json({ message: 'Unauthorized access to this receipt.' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving receipt' });
  }
};


export const cancelOrder = async (req, res) => {
  const orderId = req.params.orderId;
  const userId = req.user.id;

  try {
    const order = await Order.findById(orderId).populate({
      path: 'items',
      populate: { path: 'item', populate: { path: 'seller', select: '_id username' } }
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (String(order.user) !== String(userId)) return res.status(403).json({ message: 'Unauthorized' });

    if (!['Ordered', 'Accepted'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel an order in its current status.' });
    }

    
    order.status = 'CancellationRequested';
    await order.save();

    
    const notifiedSellers = new Set();
    for (const oi of order.items) {
      const sellerId = oi.item?.seller?._id || oi.item?.seller;
      if (sellerId && !notifiedSellers.has(String(sellerId))) {
        const notif = new Notification({
          user: sellerId,
          message: `⚠️ Cancellation Request: Order #LC-${String(order._id).slice(-6)} — the buyer has requested a cancellation. Please approve or reject in your Seller Panel.`
        });
        await notif.save();
        notifiedSellers.add(String(sellerId));
      }
    }

    res.status(200).json({ message: 'Cancellation request submitted. Awaiting seller approval.', order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error cancelling order', error: error.message });
  }
};


export const respondCancellation = async (req, res) => {
  const orderId = req.params.orderId;
  const sellerId = req.user.id;
  const { action } = req.body; 

  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Use "accept" or "reject".' });
  }

  try {
    const order = await Order.findById(orderId).populate('items');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'CancellationRequested') {
      return res.status(400).json({ message: 'This order does not have a pending cancellation request.' });
    }

    
    const sellerItems = [];
    for (const oi of order.items) {
      const itemObj = await Item.findById(oi.item);
      if (itemObj && String(itemObj.seller) === String(sellerId)) {
        sellerItems.push({ oi, itemObj });
      }
    }
    if (sellerItems.length === 0) {
      return res.status(403).json({ message: 'You are not the seller for any item in this order.' });
    }

    if (action === 'accept') {
      
      for (const { oi, itemObj } of sellerItems) {
        itemObj.stock += oi.quantity;
        await itemObj.save();

        const seller = await User.findById(sellerId);
        if (seller) {
          seller.budget -= oi.price * oi.quantity;
          await seller.save();
        }
      }

      
      const buyer = await User.findById(order.user);
      if (buyer) {
        buyer.budget += order.total_price;
        await buyer.save();
      }

      order.status = 'Cancelled';
      await order.save();

      
      const notif = new Notification({
        user: order.user,
        message: `✅ Your cancellation for Order #LC-${String(order._id).slice(-6)} was approved! ₹${order.total_price.toFixed(2)} has been refunded to your account.`
      });
      await notif.save();

      res.status(200).json({ message: `Cancellation accepted. Buyer refunded ₹${order.total_price.toFixed(2)}.`, order });

    } else {
      
      order.status = 'Ordered';
      await order.save();

      
      const notif = new Notification({
        user: order.user,
        message: `❌ Your cancellation request for Order #LC-${String(order._id).slice(-6)} was rejected by the seller. The order will continue as normal.`
      });
      await notif.save();

      res.status(200).json({ message: 'Cancellation request rejected. Order restored to active.', order });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error processing cancellation response', error: error.message });
  }
};


export const updateOrderStatus = async (req, res) => {
  const orderId = req.params.orderId;
  const sellerId = req.user.id;
  const { status } = req.body;

  if (!['Accepted', 'Rejected', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  try {
    const order = await Order.findById(orderId).populate('items');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    
    if (status === 'Rejected' && order.status !== 'Rejected') {
      
      for (const oi of order.items) {
        const itemObj = await Item.findById(oi.item);
        if (itemObj && String(itemObj.seller) === String(sellerId)) {
          
          itemObj.stock += oi.quantity;
          await itemObj.save();

          
          const seller = await User.findById(sellerId);
          seller.budget -= oi.price * oi.quantity;
          await seller.save();
        }
      }

      
      const buyer = await User.findById(order.user);
      if (buyer) {
        buyer.budget += order.total_price;
        await buyer.save();
      }

      
      const notif = new Notification({
        user: order.user,
        message: `Order #LC-${String(order._id).slice(-6)} rejected. Refunded.`
      });
      await notif.save();
    } else if (status !== order.status) {
      
      const notif = new Notification({
        user: order.user,
        message: `Order #LC-${String(order._id).slice(-6)} updated to ${status}`
      });
      await notif.save();
    }

    order.status = status;
    if (status === 'Delivered' && !order.date_delivered) {
      order.date_delivered = new Date();
    }
    await order.save();

    res.status(200).json({ message: `Order status updated to ${status}.`, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
};


export const requestReturn = async (req, res) => {
  const orderId = req.params.orderId;
  const userId = req.user.id;
  const { reason } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (String(order.user) !== String(userId)) return res.status(403).json({ message: 'Unauthorized' });

    if (order.status !== 'Delivered') {
      return res.status(400).json({ message: 'You can only return a delivered order.' });
    }

    
    if (!order.date_delivered) {
      return res.status(400).json({ message: 'Delivery date not recorded. Please contact support.' });
    }
    const daysSinceDelivery = (Date.now() - new Date(order.date_delivered).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 7) {
      return res.status(400).json({ message: 'Return window has expired. Returns are only allowed within 7 days of delivery.' });
    }

    order.status = 'ReturnRequested';
    order.return_reason = reason || 'No reason provided';
    await order.save();

    
    const orderItems = await OrderItem.find({ order: orderId }).populate({ path: 'item', select: 'seller name' });
    const notifiedSellers = new Set();
    for (const oi of orderItems) {
      const sellerId = oi.item?.seller;
      if (sellerId && !notifiedSellers.has(String(sellerId))) {
        await new Notification({
          user: sellerId,
          message: `🔄 Return Request: Order #LC-${String(order._id).slice(-6)} — the buyer has requested a return. Reason: "${order.return_reason}". Please approve or reject in your Seller Panel.`
        }).save();
        notifiedSellers.add(String(sellerId));
      }
    }

    res.status(200).json({ message: 'Return request submitted. Awaiting seller approval.', order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error requesting return', error: error.message });
  }
};


export const respondReturn = async (req, res) => {
  const orderId = req.params.orderId;
  const sellerId = req.user.id;
  const { action } = req.body; 

  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Use "accept" or "reject".' });
  }

  try {
    const order = await Order.findById(orderId).populate('items');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'ReturnRequested') {
      return res.status(400).json({ message: 'This order does not have a pending return request.' });
    }

    
    const sellerItems = [];
    for (const oi of order.items) {
      const itemObj = await Item.findById(oi.item);
      if (itemObj && String(itemObj.seller) === String(sellerId)) {
        sellerItems.push({ oi, itemObj });
      }
    }
    if (sellerItems.length === 0) {
      return res.status(403).json({ message: 'You are not the seller for any item in this order.' });
    }

    if (action === 'accept') {
      
      for (const { oi, itemObj } of sellerItems) {
        itemObj.stock += oi.quantity;
        await itemObj.save();
        const seller = await User.findById(sellerId);
        if (seller) {
          seller.budget -= oi.price * oi.quantity;
          await seller.save();
        }
      }

      
      const buyer = await User.findById(order.user);
      if (buyer) {
        buyer.budget += order.total_price;
        await buyer.save();
      }

      order.status = 'Returned';
      await order.save();

      await new Notification({
        user: order.user,
        message: `✅ Your return for Order #LC-${String(order._id).slice(-6)} was approved! ₹${order.total_price.toFixed(2)} has been refunded to your account.`
      }).save();

      res.status(200).json({ message: `Return accepted. Buyer refunded ₹${order.total_price.toFixed(2)}.`, order });

    } else {
      
      order.status = 'Delivered';
      await order.save();

      await new Notification({
        user: order.user,
        message: `❌ Your return request for Order #LC-${String(order._id).slice(-6)} was rejected by the seller.`
      }).save();

      res.status(200).json({ message: 'Return request rejected. Order remains as delivered.', order });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error processing return response', error: error.message });
  }
};


export const getProfileDashboard = async (req, res) => {
  const userId = req.user.id;

  try {
    
    const orders = await Order.find({ user: userId });
    const totalSpent = orders.reduce((sum, o) => sum + o.total_price, 0.0);
    const loyaltyPoints = Math.floor(totalSpent / 10);
    const orderCount = orders.length;

    const wishlist = await Wishlist.findOne({ user: userId });
    const wishlistCount = wishlist ? await WishlistItem.countDocuments({ wishlist: wishlist._id }) : 0;

    
    const badges = [];
    if (orderCount > 5) {
      badges.push({ name: 'Elite Buyer', icon: '🏆', desc: 'More than 5 purchases' });
    }
    if (totalSpent > 1000) {
      badges.push({ name: 'High Roller', icon: '💎', desc: 'Spent over ₹1000' });
    }
    if (req.user.role === 'consumer') {
      badges.push({ name: 'Lucky Member', icon: '🛡️', desc: 'Verified Member' });
    }

    
    const userOrders = await Order.find({ user: userId }).populate({
      path: 'items',
      populate: { path: 'item' }
    });

    const categoryCounts = ;
    userOrders.forEach(o => {
      o.items.forEach(oi => {
        if (oi.item && oi.item.category) {
          categoryCounts[oi.item.category] = (categoryCounts[oi.item.category] || 0) + oi.quantity;
        }
      });
    });

    const categories = Object.keys(categoryCounts);
    const savings = Math.floor(totalSpent * 0.05);
    const loyaltyProgress = (loyaltyPoints % 1000) / 10;

    
    const monthlySpend = [120, 450, 300, 800, parseFloat((totalSpent % 1000).toFixed(2))];
    const maxSpend = Math.max(...monthlySpend) || 1;
    const barHeights = monthlySpend.map(val => (val / maxSpend) * 100);

    
    const notifications = await Notification.find({ user: userId })
      .sort({ date_created: -1 })
      .limit(10);
    
    const unreadNotifCount = await Notification.countDocuments({ user: userId, is_read: false });

    
    await Notification.updateMany({ user: userId, is_read: false }, { is_read: true });

    
    const recentlyViewedDocs = await ViewedItem.find({ user: userId })
      .sort({ date_viewed: -1 })
      .limit(6)
      .populate('item');
    const recentlyViewed = recentlyViewedDocs.map(rv => rv.item).filter(Boolean);

    res.status(200).json({
      totalSpent,
      loyaltyPoints,
      loyaltyProgress,
      orderCount,
      wishlistCount,
      badges,
      analytics: {
        monthlySpend,
        barHeights,
        categories: categories.length ? categories : ['General'],
        savings
      },
      notifications,
      unreadNotifCount,
      recentlyViewed
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving profile statistics' });
  }
};


export const getNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    const notifications = await Notification.find({ user: userId })
      .sort({ date_created: -1 })
      .limit(20);
    const unreadCount = await Notification.countDocuments({ user: userId, is_read: false });
    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};


export const markNotificationsRead = async (req, res) => {
  const userId = req.user.id;
  try {
    await Notification.updateMany({ user: userId, is_read: false }, { is_read: true });
    res.status(200).json({ message: 'Notifications marked as read.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking notifications as read' });
  }
};
