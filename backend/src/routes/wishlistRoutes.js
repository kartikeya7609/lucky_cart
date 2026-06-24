import express from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
  toggleWishlistPrivacy,
  getPublicWishlist
} from '../controllers/wishlistController.js';
import { protect, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getWishlist);
router.post('/add/:itemId', protect, addToWishlist);
router.delete('/:wishlistItemId', protect, removeFromWishlist);
router.post('/move-to-cart/:wishlistItemId', protect, moveToCart);
router.post('/toggle-privacy', protect, toggleWishlistPrivacy);
router.get('/public/:username', optionalProtect, getPublicWishlist);

export default router;
