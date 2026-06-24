import express from 'express';
import { getAddresses, addAddress, setDefaultAddress, deleteAddress } from '../controllers/addressController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getAddresses);
router.post('/', protect, addAddress);
router.put('/default/:id', protect, setDefaultAddress);
router.delete('/:id', protect, deleteAddress);

export default router;
