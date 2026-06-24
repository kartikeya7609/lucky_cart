import mongoose from 'mongoose';

const viewedItemSchema = new mongoose.Schema({
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
  date_viewed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to quickly find user-item view logs
viewedItemSchema.index({ user: 1, item: 1 }, { unique: true });

const ViewedItem = mongoose.model('ViewedItem', viewedItemSchema);
export default ViewedItem;
