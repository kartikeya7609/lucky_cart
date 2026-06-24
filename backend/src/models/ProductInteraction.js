import mongoose from 'mongoose';

const productInteractionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  interaction_type: {
    type: String,
    enum: ['VIEWED', 'LIKED', 'WISHLISTED', 'PURCHASED', 'SHARED'],
    required: true
  },
  weight: {
    type: Number,
    required: true,
    default: 1 // VIEWED=1, LIKED=2, SHARED=3, WISHLISTED=4, PURCHASED=5
  }
}, {
  timestamps: true
});

// Indexes to speed up collaborative filtering queries
productInteractionSchema.index({ user: 1, product: 1, interaction_type: 1 });
productInteractionSchema.index({ product: 1, interaction_type: 1 });

const ProductInteraction = mongoose.model('ProductInteraction', productInteractionSchema);
export default ProductInteraction;
