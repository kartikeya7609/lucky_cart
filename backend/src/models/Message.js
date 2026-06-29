import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null if it is a group message
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null // null if it is a direct message
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  message_type: {
    type: String,
    enum: ['TEXT', 'PRODUCT', 'WISHLIST', 'CART', 'SYSTEM'],
    default: 'TEXT'
  },
  content: {
    type: String,
    required: true
  },
  metadata: {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null
    },
    wishlistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wishlist',
      default: null
    },
    cartItems: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
      },
      quantity: {
        type: Number,
        default: 1
      }
    }]
  },
  is_read: {
    type: Boolean,
    default: false
  },
  reactions: {
    type: Map,
    of: [String],
    default: {}
  }
}, {
  timestamps: true
});

// Indexes to optimize inbox loading and chat scrolls
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
