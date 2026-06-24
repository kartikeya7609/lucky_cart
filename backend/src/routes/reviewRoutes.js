import express from 'express';
import multer from 'multer';
import { submitReview, replyToReview, deleteReview, editReview, deleteSellerReply } from '../controllers/reviewController.js';
import { protect, sellerOnly } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/item/:itemId', protect, upload.single('review_image'), submitReview);
router.put('/:reviewId', protect, upload.single('review_image'), editReview);
router.delete('/:reviewId', protect, deleteReview);
router.post('/:reviewId/reply', protect, sellerOnly, replyToReview);
router.delete('/:reviewId/reply', protect, sellerOnly, deleteSellerReply);

export default router;
