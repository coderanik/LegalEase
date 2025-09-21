import express from 'express';
import { verifyToken } from '../middlewares/devAuthMiddleware.js';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  googleLogin,
  handleOAuthCallback,
  refreshToken
} from '../controllers/devAuthController.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/google', googleLogin);
router.get('/callback', handleOAuthCallback);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);

export default router;
