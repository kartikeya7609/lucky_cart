import express from 'express';
import { getMyOrders, getSellerOrders, getReceipt, cancelOrder, updateOrderStatus, getProfileDashboard, respondCancellation, getNotifications, markNotificationsRead, requestReturn, respondReturn } from '../controllers/orderController.js';
import { protect, sellerOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/my-orders', protect, getMyOrders);
router.get('/seller-orders', protect, sellerOnly, getSellerOrders);
router.get('/receipt/:orderId', protect, getReceipt);
router.post('/cancel/:orderId', protect, cancelOrder);
router.post('/cancel-response/:orderId', protect, sellerOnly, respondCancellation);
router.put('/status/:orderId', protect, sellerOnly, updateOrderStatus);
router.post('/return/:orderId', protect, requestReturn);
router.post('/return-response/:orderId', protect, sellerOnly, respondReturn);
router.get('/profile-dashboard', protect, getProfileDashboard);
router.get('/notifications', protect, getNotifications);
router.post('/notifications/mark-read', protect, markNotificationsRead);

export default router;
