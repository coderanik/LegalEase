import express from 'express';
import {
  queryDocument,
  getDocumentQueryHistory,
  getAllUserQueries
} from '../controllers/queryDocumentController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Document query routes
router.post('/document/:documentId', queryDocument);              // POST /api/query/document/:documentId
router.get('/document/:documentId/history', getDocumentQueryHistory); // GET /api/query/document/:documentId/history
router.get('/all', getAllUserQueries);                           // GET /api/query/all

export default router;

