import express from 'express';
import multer from 'multer';
import { registerUser, loginUser, verifyOtp, refreshToken, logoutUser, getMe, updateMe, adminLogin } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/admin-login', adminLogin);
router.post('/verify-otp', verifyOtp);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.put('/me', protect, upload.single('profile_pic'), updateMe);

export default router;
