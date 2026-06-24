import { Wishlist, WishlistItem, Item, CartItem, User } from '../models/index.js';

// Get Current User's Wishlist
export const getWishlist = async (req, res) => {
  const userId = req.user.id;

  try {
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId });
      await wishlist.save();
    }

    const items = await WishlistItem.find({ wishlist: wishlist._id }).populate('item');
    res.status(200).json({ wishlist, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving wishlist' });
  }
};

// Add to Wishlist
export const addToWishlist = async (req, res) => {
  const userId = req.user.id;
  const itemId = req.params.itemId;

  try {
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId });
      await wishlist.save();
    }

    // Check if already in wishlist
    const exists = await WishlistItem.findOne({ wishlist: wishlist._id, item: itemId });
    if (exists) {
      return res.status(200).json({ message: 'Already in wishlist!' });
    }

    const wishlistItem = new WishlistItem({
      wishlist: wishlist._id,
      item: itemId
    });
    await wishlistItem.save();

    res.status(201).json({ message: 'Added to wishlist!', wishlistItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error adding to wishlist' });
  }
};

// Remove from Wishlist
export const removeFromWishlist = async (req, res) => {
  const wishlistItemId = req.params.wishlistItemId;
  const userId = req.user.id;

  try {
    const wi = await WishlistItem.findById(wishlistItemId).populate('wishlist');
    if (!wi) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }

    // Auth check
    if (String(wi.wishlist.user) !== String(userId)) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    await WishlistItem.findByIdAndDelete(wishlistItemId);
    res.status(200).json({ message: 'Removed from wishlist.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error removing from wishlist' });
  }
};

// Move from Wishlist to Cart
export const moveToCart = async (req, res) => {
  const wishlistItemId = req.params.wishlistItemId;
  const userId = req.user.id;

  try {
    const wi = await WishlistItem.findById(wishlistItemId).populate('wishlist').populate('item');
    if (!wi) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }

    if (String(wi.wishlist.user) !== String(userId)) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    const item = wi.item;
    if (item.stock > 0) {
      const existing = await CartItem.findOne({ user: userId, item: item._id });
      if (existing) {
        if (existing.quantity < item.stock) {
          existing.quantity += 1;
          await existing.save();
        } else {
          return res.status(400).json({ message: 'Not enough stock!' });
        }
      } else {
        const newCartItem = new CartItem({
          user: userId,
          item: item._id,
          quantity: 1
        });
        await newCartItem.save();
      }

      const name = item.name;
      await WishlistItem.findByIdAndDelete(wishlistItemId);

      res.status(200).json({ message: `Moved ${name} to cart!` });
    } else {
      res.status(400).json({ message: `${item.name} is out of stock!` });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error moving to cart' });
  }
};

// Toggle privacy
export const toggleWishlistPrivacy = async (req, res) => {
  const userId = req.user.id;

  try {
    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.is_public = !wishlist.is_public;
    await wishlist.save();

    res.status(200).json({
      message: `Wishlist is now ${wishlist.is_public ? 'public' : 'private'}.`,
      is_public: wishlist.is_public
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error toggling privacy' });
  }
};

// Get Public Wishlist by Username
export const getPublicWishlist = async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user ? req.user.id : null;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const wishlist = await Wishlist.findOne({ user: user._id });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    // Check privacy
    if (!wishlist.is_public && String(currentUserId) !== String(user._id)) {
      return res.status(403).json({ message: 'This wishlist is private.' });
    }

    const items = await WishlistItem.find({ wishlist: wishlist._id }).populate('item');
    res.status(200).json({
      username: user.username,
      is_public: wishlist.is_public,
      items
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving public wishlist' });
  }
};
