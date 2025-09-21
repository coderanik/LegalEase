import express from 'express';
import {
  getDocumentMetadata,
  getDocumentStatus,
  getAllDocumentsMetadata,
  getDocumentsByCategory,
  getDocumentStatistics,
  searchDocuments,
  getDocumentAnalyticsPeriod,
  getDocumentTrendsData,
  getDocumentPerformanceData
} from '../controllers/getDocumentController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Document metadata and status routes
router.get('/metadata/:id', getDocumentMetadata);                    // GET /api/documents/metadata/:id
router.get('/status/:id', getDocumentStatus);                       // GET /api/documents/status/:id
router.get('/all', getAllDocumentsMetadata);                        // GET /api/documents/all
router.get('/category/:category', getDocumentsByCategory);          // GET /api/documents/category/:category
router.get('/statistics', getDocumentStatistics);                   // GET /api/documents/statistics
router.get('/search', searchDocuments);                             // GET /api/documents/search

// Analytics and performance routes
router.get('/analytics', getDocumentAnalyticsPeriod);               // GET /api/documents/analytics
router.get('/trends', getDocumentTrendsData);                       // GET /api/documents/trends
router.get('/performance', getDocumentPerformanceData);             // GET /api/documents/performance

export default router;
