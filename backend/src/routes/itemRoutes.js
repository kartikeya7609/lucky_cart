import express from 'express';
import multer from 'multer';
import {
  getMarketplaceItems,
  getItemDetails,
  addItem,
  editItem,
  getMyListings,
  uploadCsv,
  getCsvTemplate
} from '../controllers/itemController.js';
import { protect, optionalProtect, sellerOnly } from '../middleware/auth.js';

const router = express.Router();


const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', getMarketplaceItems);
router.get('/my-listings', protect, sellerOnly, getMyListings);
router.get('/csv-template', getCsvTemplate);
router.get('/:id', optionalProtect, getItemDetails);

router.post('/', protect, sellerOnly, upload.single('user_file'), addItem);
router.put('/:id', protect, sellerOnly, upload.single('image_file'), editItem);
router.post('/csv-upload', protect, sellerOnly, upload.single('file'), uploadCsv);

export default router;
