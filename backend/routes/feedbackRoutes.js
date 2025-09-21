import express from 'express';
import {
  submitQueryFeedback,
  submitClauseFeedback,
  submitDocumentFeedback,
  getFeedbackAnalytics,
  getFeedbackSuggestions
} from '../controllers/updateFeedbackController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Feedback submission routes
router.post('/query/:queryId', submitQueryFeedback);             // POST /api/feedback/query/:queryId
router.post('/clause/:clauseId', submitClauseFeedback);          // POST /api/feedback/clause/:clauseId
router.post('/document/:documentId', submitDocumentFeedback);    // POST /api/feedback/document/:documentId

// Feedback analytics routes
router.get('/analytics', getFeedbackAnalytics);                  // GET /api/feedback/analytics
router.get('/suggestions', getFeedbackSuggestions);              // GET /api/feedback/suggestions

export default router;

