import express from 'express';
import { getAdminOrders, exportDataCsv } from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/orders', protect, adminOnly, getAdminOrders);
router.get('/export-csv', protect, adminOnly, exportDataCsv);

export default router;
