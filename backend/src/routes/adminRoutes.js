import express from 'express';
import { 
  getAdminOrders, 
  exportDataCsv, 
  getAdminUsers, 
  getAdminProducts, 
  getAdminReviews, 
  approveReview, 
  adminDeleteReview, 
  getAdminActivity,
  updateAdminProductStock,
  deleteAdminProduct
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/orders', protect, adminOnly, getAdminOrders);
router.get('/users', protect, adminOnly, getAdminUsers);
router.get('/products', protect, adminOnly, getAdminProducts);
router.put('/products/:id/stock', protect, adminOnly, updateAdminProductStock);
router.delete('/products/:id', protect, adminOnly, deleteAdminProduct);
router.get('/reviews', protect, adminOnly, getAdminReviews);
router.put('/reviews/:id/approve', protect, adminOnly, approveReview);
router.delete('/reviews/:id', protect, adminOnly, adminDeleteReview);
router.get('/activity', protect, adminOnly, getAdminActivity);
router.get('/export-csv', protect, adminOnly, exportDataCsv);

export default router;
