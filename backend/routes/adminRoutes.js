import express from 'express';
import {
  getSystemOverview,
  getAllUsers,
  getUserDetails,
  getSystemAnalytics,
  getFileHandlingStats,
  performAdminAction
} from '../controllers/adminController.js';
import { 
  requireAdmin, 
  requireSuperAdmin, 
  logAdminAction, 
  adminRateLimit,
  validateAdminSession 
} from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

// Apply rate limiting (100 requests per 15 minutes)
router.use(adminRateLimit(100, 15 * 60 * 1000));

// Apply admin action logging
router.use(logAdminAction);

// Apply session validation
router.use(validateAdminSession);

// Dashboard and overview routes
router.get('/dashboard', getSystemOverview);                     // GET /api/admin/dashboard
router.get('/analytics', getSystemAnalytics);                   // GET /api/admin/analytics
router.get('/file-stats', getFileHandlingStats);                // GET /api/admin/file-stats

// User management routes
router.get('/users', getAllUsers);                              // GET /api/admin/users
router.get('/users/:userId', getUserDetails);                   // GET /api/admin/users/:userId

// Admin actions (require super admin for critical operations)
router.post('/actions', performAdminAction);                    // POST /api/admin/actions

// Super admin only routes
router.post('/actions/critical', requireSuperAdmin, performAdminAction); // POST /api/admin/actions/critical

export default router;

