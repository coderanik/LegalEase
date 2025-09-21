import express from 'express';
import {
  extractClauses,
  getDocumentClauses,
  analyzeClause,
  searchClauses,
  getClauseStatistics
} from '../controllers/getClausesController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Clause extraction and analysis routes
router.post('/extract/:documentId', extractClauses);                // POST /api/clauses/extract/:documentId
router.get('/document/:documentId', getDocumentClauses);            // GET /api/clauses/document/:documentId
router.post('/analyze/:clauseId', analyzeClause);                   // POST /api/clauses/analyze/:clauseId
router.get('/search', searchClauses);                               // GET /api/clauses/search
router.get('/statistics', getClauseStatistics);                     // GET /api/clauses/statistics

export default router;
