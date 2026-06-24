import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  date_added: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const CartItem = mongoose.model('CartItem', cartItemSchema);
export default CartItem;
