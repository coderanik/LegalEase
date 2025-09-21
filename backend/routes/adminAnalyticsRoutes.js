import express from 'express';
import {
  getRealTimeMetrics,
  getUserActivityPatterns,
  getAIPerformanceAnalytics,
  getSecurityComplianceReport,
  getSystemRecommendations
} from '../controllers/adminAnalyticsController.js';
import { 
  requireAdmin, 
  logAdminAction, 
  adminRateLimit,
  validateAdminSession 
} from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

// Apply rate limiting (50 requests per 15 minutes for analytics)
router.use(adminRateLimit(50, 15 * 60 * 1000));

// Apply admin action logging
router.use(logAdminAction);

// Apply session validation
router.use(validateAdminSession);

// Real-time monitoring routes
router.get('/realtime', getRealTimeMetrics);                     // GET /api/admin/analytics/realtime

// Pattern analysis routes
router.get('/user-activity', getUserActivityPatterns);          // GET /api/admin/analytics/user-activity
router.get('/ai-performance', getAIPerformanceAnalytics);       // GET /api/admin/analytics/ai-performance

// Security and compliance routes
router.get('/security', getSecurityComplianceReport);           // GET /api/admin/analytics/security

// AI-powered recommendations
router.get('/recommendations', getSystemRecommendations);       // GET /api/admin/analytics/recommendations

export default router;

