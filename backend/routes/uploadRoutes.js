import express from 'express';
import {
  upload,
  uploadDocument,
  uploadMultipleDocuments,
  getUserDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  downloadDocument
} from '../controllers/uploadDocumentController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { fileUploadSchema, multipleFileUploadSchema, documentUpdateSchema, documentQuerySchema } from '../utils/fileValidation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// File upload routes
router.post('/single', upload.single('document'), uploadDocument);                    // POST /api/upload/single
router.post('/multiple', upload.array('documents', 10), uploadMultipleDocuments);    // POST /api/upload/multiple

// Document management routes
router.get('/documents', getUserDocuments);                                          // GET /api/upload/documents
router.get('/documents/:id', getDocument);                                           // GET /api/upload/documents/:id
router.put('/documents/:id', updateDocument);                                        // PUT /api/upload/documents/:id
router.delete('/documents/:id', deleteDocument);                                     // DELETE /api/upload/documents/:id
router.get('/documents/:id/download', downloadDocument);                             // GET /api/upload/documents/:id/download

export default router;
