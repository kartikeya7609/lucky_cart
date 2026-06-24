import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema({
  wishlist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wishlist',
    required: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  }
}, {
  timestamps: true
});

const WishlistItem = mongoose.model('WishlistItem', wishlistItemSchema);
export default WishlistItem;
