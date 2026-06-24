import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 30
  },
  price: {
    type: Number,
    required: true
  },
  original_price: {
    type: Number
  },
  barcode: {
    type: String,
    required: true,
    unique: true,
    maxlength: 12
  },
  description: {
    type: String,
    required: true,
    maxlength: 1024
  },
  user_file: {
    type: String,
    default: 'default.jpg'
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stock: {
    type: Number,
    default: 1
  },
  category: {
    type: String,
    default: 'General',
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for reviews
itemSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'item'
});

// Virtual for average rating
itemSchema.virtual('average_rating').get(function () {
  if (!this.reviews || this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, rev) => acc + rev.rating, 0);
  return sum / this.reviews.length;
});

const Item = mongoose.model('Item', itemSchema);
export default Item;
