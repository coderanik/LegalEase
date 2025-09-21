import express from 'express';
import {
  getAllDocuments,
  getDocumentsByStatus,
  getRecentDocuments,
  getDocumentCategories
} from '../controllers/getAllDocumentsController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Document listing routes
router.get('/', getAllDocuments);                                 // GET /api/documents/all
router.get('/status/:status', getDocumentsByStatus);             // GET /api/documents/status/:status
router.get('/recent', getRecentDocuments);                       // GET /api/documents/recent
router.get('/categories', getDocumentCategories);                // GET /api/documents/categories

export default router;

