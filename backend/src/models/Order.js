import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  total_price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Ordered', 'Accepted', 'Rejected', 'Shipped', 'Delivered', 'Cancelled', 'CancellationRequested', 'ReturnRequested', 'Returned'],
    default: 'Ordered'
  },
  date_delivered: {
    type: Date
  },
  return_reason: {
    type: String
  },
  date_ordered: {
    type: Date,
    default: Date.now
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

orderSchema.virtual('items', {
  ref: 'OrderItem',
  localField: '_id',
  foreignField: 'order'
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
