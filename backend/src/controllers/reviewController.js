import { Review, Item, Order, OrderItem } from '../models/index.js';
import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

// ─── Helper: upload buffer to Cloudinary ──────────────────────────────────────
const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'lucky_cart_reviews' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    Readable.from(buffer).pipe(stream);
  });

// ─── Submit / Update Review (consumer) ───────────────────────────────────────
export const submitReview = async (req, res) => {
  const itemId = req.params.itemId;
  const userId = req.user.id;
  const { rating, comment } = req.body;

  try {
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    // Verify purchase
    const userOrders = await Order.find({ user: userId });
    const orderIds = userOrders.map(o => o._id);
    const purchased = await OrderItem.findOne({ order: { $in: orderIds }, item: itemId });
    if (!purchased) {
      return res.status(403).json({ message: 'You must purchase this item first to leave a review.' });
    }

    // Upload image if provided
    let imageUrl = undefined;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        imageUrl = result.secure_url;
      } catch (uploadErr) {
        return res.status(500).json({ message: `Image upload failed: ${uploadErr.message}` });
      }
    }

    // Upsert review
    let review = await Review.findOne({ user: userId, item: itemId });
    if (review) {
      review.rating = parseInt(rating);
      review.comment = comment;
      if (imageUrl) review.image_file = imageUrl;
      await review.save();
      return res.status(200).json({ message: 'Review updated!', review });
    }

    review = new Review({
      user: userId,
      item: itemId,
      rating: parseInt(rating),
      comment,
      is_verified: true,
      image_file: imageUrl
    });
    await review.save();
    res.status(201).json({ message: 'Review submitted!', review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error saving review', error: error.message });
  }
};

// ─── Edit Review (consumer — own review only) ─────────────────────────────────
export const editReview = async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.id;
  const { rating, comment } = req.body;

  try {
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (String(review.user) !== String(userId)) {
      return res.status(403).json({ message: 'You can only edit your own review.' });
    }

    if (rating) review.rating = parseInt(rating);
    if (comment) review.comment = comment;

    // Upload new image if provided
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        review.image_file = result.secure_url;
      } catch (uploadErr) {
        return res.status(500).json({ message: `Image upload failed: ${uploadErr.message}` });
      }
    }

    await review.save();
    res.status(200).json({ message: 'Review updated!', review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error editing review', error: error.message });
  }
};

// ─── Delete Review ────────────────────────────────────────────────────────────
// Consumer: delete own review
// Seller: delete any review on their own items (moderation)
export const deleteReview = async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const review = await Review.findById(reviewId).populate('item');
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const isOwner = String(review.user) === String(userId);
    const isSeller = userRole === 'seller' && review.item && String(review.item.seller) === String(userId);

    if (!isOwner && !isSeller) {
      return res.status(403).json({ message: 'Not authorised to delete this review.' });
    }

    await Review.findByIdAndDelete(reviewId);
    res.status(200).json({ message: 'Review deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting review', error: error.message });
  }
};

// ─── Reply to Review (seller — own items only) ───────────────────────────────
export const replyToReview = async (req, res) => {
  const { reviewId } = req.params;
  const sellerId = req.user.id;
  const { reply } = req.body;

  try {
    const review = await Review.findById(reviewId).populate('item');
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (String(review.item.seller) !== String(sellerId)) {
      return res.status(403).json({ message: 'Unauthorized. You can only reply to reviews on your own items.' });
    }

    review.seller_reply = reply;
    await review.save();
    res.status(200).json({ message: 'Reply posted!', review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error posting seller reply' });
  }
};

// ─── Delete Seller Reply (seller — own items only) ───────────────────────────
export const deleteSellerReply = async (req, res) => {
  const { reviewId } = req.params;
  const sellerId = req.user.id;

  try {
    const review = await Review.findById(reviewId).populate('item');
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (String(review.item.seller) !== String(sellerId)) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    review.seller_reply = undefined;
    await review.save();
    res.status(200).json({ message: 'Reply deleted.', review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting reply' });
  }
};
