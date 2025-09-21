import express from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  googleLogin,
  handleOAuthCallback,
  refreshToken
} from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes (no authentication required)
router.post('/register', register);                    // POST /api/auth/register
router.post('/login', login);                          // POST /api/auth/login
router.post('/logout', logout);                        // POST /api/auth/logout
router.get('/google', googleLogin);                    // GET /api/auth/google
router.get('/callback', handleOAuthCallback);          // GET /api/auth/callback
router.post('/refresh', refreshToken);                 // POST /api/auth/refresh

// Protected routes (authentication required)
router.get('/profile', authenticateToken, getProfile); // GET /api/auth/profile
router.put('/profile', authenticateToken, updateProfile); // PUT /api/auth/profile

export default router;
