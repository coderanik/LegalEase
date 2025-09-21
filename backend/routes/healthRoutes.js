import express from 'express';
import {
  basicHealthCheck,
  comprehensiveHealthCheck,
  getServiceMetrics,
  getApiStatus
} from '../controllers/healthCheckController.js';

const router = express.Router();

// Health check routes (no authentication required)
router.get('/', basicHealthCheck);                               // GET /api/health
router.get('/comprehensive', comprehensiveHealthCheck);          // GET /api/health/comprehensive
router.get('/metrics', getServiceMetrics);                       // GET /api/health/metrics (requires auth)
router.get('/status', getApiStatus);                             // GET /api/health/status

export default router;

