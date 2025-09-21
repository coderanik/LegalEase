import express from 'express';
import {
  deleteDocument,
  deleteMultipleDocuments,
  deleteDocumentsByCategory,
  getDeletionPreview
} from '../controllers/deleteDocumentController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Document deletion routes
router.delete('/:documentId', deleteDocument);                   // DELETE /api/delete/:documentId
router.post('/multiple', deleteMultipleDocuments);               // POST /api/delete/multiple
router.delete('/category/:category', deleteDocumentsByCategory); // DELETE /api/delete/category/:category
router.get('/preview', getDeletionPreview);                     // GET /api/delete/preview

export default router;

