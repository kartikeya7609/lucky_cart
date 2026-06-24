import { CartItem, Item, User, Order, OrderItem, Coupon, Wishlist, WishlistItem, Notification } from '../models/index.js';


export const getCart = async (req, res) => {
  const userId = req.user.id;
  
  if (req.user.role === 'admin') {
    return res.status(200).json({
      cartItems: [], subtotal: 0, discount: 0, total: 0, estDelivery: '', appliedCoupon: null, messages: []
    });
  }

  const couponCode = req.query.couponCode; 

  try {
    let cartItems = await CartItem.find({ user: userId }).populate('item');
    const now = new Date();
    let revalidated = false;
    let expired = false;
    const messages = [];

    for (const c of cartItems) {
      
      const diffMs = now - new Date(c.date_added);
      const diffMins = diffMs / (1000 * 60);
      
      if (diffMins > 30) {
        await CartItem.findByIdAndDelete(c._id);
        expired = true;
        continue;
      }

      
      if (!c.item || c.item.stock <= 0) {
        await CartItem.findByIdAndDelete(c._id);
        messages.push(`${c.item ? c.item.name : 'An item'} is sold out and has been removed.`);
        revalidated = true;
      } else if (c.item.stock < c.quantity) {
        c.quantity = c.item.stock;
        await c.save();
        messages.push(`Adjusted ${c.item.name} to ${c.item.stock} units due to limited stock.`);
        revalidated = true;
      }
    }

    
    if (revalidated || expired) {
      cartItems = await CartItem.find({ user: userId }).populate('item');
    }

    
    const subtotal = cartItems.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
    let discount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), is_active: true });
      if (coupon) {
        discount = (subtotal * coupon.discount_percent) / 100;
        appliedCoupon = {
          code: coupon.code,
          discount_percent: coupon.discount_percent
        };
      }
    }

    const total = subtotal - discount;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 4);
    const estDelivery = deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    res.status(200).json({
      cartItems,
      subtotal,
      discount,
      total,
      estDelivery,
      appliedCoupon,
      messages: expired ? ['Some items expired and were removed.', ...messages] : messages
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving cart' });
  }
};


export const addToCart = async (req, res) => {
  const userId = req.user.id;
  
  const { item_id, added_item } = req.body;

  try {
    let itemObj;
    if (item_id) {
      itemObj = await Item.findOne({ _id: item_id, stock: { $gt: 0 } });
    } else if (added_item) {
      itemObj = await Item.findOne({ name: added_item, stock: { $gt: 0 } });
    }
    if (!itemObj) {
      return res.status(404).json({ message: 'Item not found or out of stock!' });
    }

    let existing = await CartItem.findOne({ user: userId, item: itemObj._id });
    if (existing) {
      if (existing.quantity < itemObj.stock) {
        existing.quantity += 1;
        existing.date_added = new Date(); 
        await existing.save();
        res.status(200).json({ message: `Increased ${itemObj.name} quantity!`, cartItem: existing });
      } else {
        res.status(400).json({ message: 'Not enough stock!' });
      }
    } else {
      const newCartItem = new CartItem({
        user: userId,
        item: itemObj._id,
        quantity: 1,
        date_added: new Date()
      });
      await newCartItem.save();
      res.status(201).json({ message: `Added ${itemObj.name} to cart!`, cartItem: newCartItem });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error adding to cart' });
  }
};


export const removeFromCart = async (req, res) => {
  const cartItemId = req.params.cartItemId;
  const userId = req.user.id;

  try {
    const cartItem = await CartItem.findOneAndDelete({ _id: cartItemId, user: userId }).populate('item');
    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res.status(200).json({ message: `Removed ${cartItem.item.name}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error removing from cart' });
  }
};


export const applyCoupon = async (req, res) => {
  const { coupon_code } = req.body;

  try {
    const coupon = await Coupon.findOne({ code: coupon_code.toUpperCase(), is_active: true });
    if (!coupon) {
      return res.status(400).json({ message: 'Invalid or expired coupon.' });
    }

    res.status(200).json({
      message: `Coupon '${coupon.code}' applied! ${coupon.discount_percent}% off.`,
      coupon: {
        code: coupon.code,
        discount_percent: coupon.discount_percent
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error applying coupon' });
  }
};


export const saveForLater = async (req, res) => {
  const cartItemId = req.params.cartItemId;
  const userId = req.user.id;

  try {
    const cartItem = await CartItem.findOne({ _id: cartItemId, user: userId }).populate('item');
    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found or unauthorized' });
    }

    const item = cartItem.item;
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId });
      await wishlist.save();
    }

    
    const exists = await WishlistItem.findOne({ wishlist: wishlist._id, item: item._id });
    if (!exists) {
      const wishItem = new WishlistItem({ wishlist: wishlist._id, item: item._id });
      await wishItem.save();
    }

    const itemName = item.name;
    await CartItem.findByIdAndDelete(cartItemId);

    res.status(200).json({ message: `Moved ${itemName} to Wishlist.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error saving for later' });
  }
};


export const checkout = async (req, res) => {
  const userId = req.user.id;
  const { couponCode, addressId } = req.body;

  try {
    const cartItems = await CartItem.find({ user: userId }).populate('item');
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty!' });
    }

    
    const subtotal = cartItems.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
    let discount = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), is_active: true });
      if (coupon) {
        discount = (subtotal * coupon.discount_percent) / 100;
      }
    }

    const total = subtotal - discount;

    const buyer = await User.findById(userId);
    if (!buyer.canPurchase(total)) {
      return res.status(400).json({ message: 'Insufficient funds.' });
    }

    
    for (const c of cartItems) {
      if (c.item.stock < c.quantity) {
        return res.status(400).json({ message: `Not enough stock for ${c.item.name}.` });
      }
    }

    
    for (const c of cartItems) {
      const itemObj = await Item.findById(c.item._id);
      itemObj.stock -= c.quantity;
      await itemObj.save();

      if (itemObj.seller) {
        const sellerObj = await User.findById(itemObj.seller);
        if (sellerObj) {
          sellerObj.budget += itemObj.price * c.quantity;
          await sellerObj.save();
        }
      }
    }

    
    buyer.budget -= total;
    await buyer.save();

    
    const order = new Order({
      user: userId,
      total_price: total,
      address: addressId || null
    });
    await order.save();

    for (const c of cartItems) {
      const orderItem = new OrderItem({
        order: order._id,
        item: c.item._id,
        quantity: c.quantity,
        price: c.item.price
      });
      await orderItem.save();
    }

    
    await CartItem.deleteMany({ user: userId });

    
    const notifiedSellers = new Set();
    for (const c of cartItems) {
      if (c.item.seller) {
        const sellerIdStr = String(c.item.seller);
        if (!notifiedSellers.has(sellerIdStr)) {
          const notif = new Notification({
            user: c.item.seller,
            message: `New Order #LC-${String(order._id).slice(-6)} received!`
          });
          await notif.save();
          notifiedSellers.add(sellerIdStr);
        }
      }
    }

    res.status(200).json({
      message: `Purchase successful! Total: ₹${total.toFixed(2)}`,
      orderId: order._id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during checkout', error: error.message });
  }
};
