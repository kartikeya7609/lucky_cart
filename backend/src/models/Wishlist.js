import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  is_public: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

wishlistSchema.virtual('items', {
  ref: 'WishlistItem',
  localField: '_id',
  foreignField: 'wishlist'
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);
export default Wishlist;
