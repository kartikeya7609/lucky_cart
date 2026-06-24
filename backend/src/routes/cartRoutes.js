import express from 'express';
import { getCart, addToCart, removeFromCart, applyCoupon, saveForLater, checkout } from '../controllers/cartController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getCart);
router.post('/add', protect, addToCart);
router.delete('/:cartItemId', protect, removeFromCart);
router.post('/apply-coupon', protect, applyCoupon);
router.post('/save-for-later/:cartItemId', protect, saveForLater);
router.post('/checkout', protect, checkout);

export default router;
