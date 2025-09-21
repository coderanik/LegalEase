import { supabase } from '../config/db.js';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { promisify } from 'util';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and image files are allowed.'), false);
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload single document
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.user?.userId;
    const { title, description, category } = req.body;
    const file = req.file;

    // Upload file to Supabase Storage
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = `documents/${userId}/${fileName}`;

    // Read file buffer
    const fileBuffer = fs.readFileSync(file.path);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBuffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      // Clean up local file
      fs.unlinkSync(file.path);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file to storage',
        error: uploadError.message
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Save document metadata to database
    const { data: documentData, error: dbError } = await supabase
      .from('documents')
      .insert([
        {
          id: uuidv4(),
          user_id: userId,
          title: title || file.originalname,
          description: description || null,
          category: category || 'general',
          file_name: file.originalname,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.mimetype,
          file_extension: fileExt,
          upload_status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file from storage
      await supabase.storage.from('documents').remove([filePath]);
      // Clean up local file
      fs.unlinkSync(file.path);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to save document metadata',
        error: dbError.message
      });
    }

    // Clean up local file
    fs.unlinkSync(file.path);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document: documentData,
        file_url: urlData.publicUrl
      }
    });

  } catch (error) {
    console.error('Upload document error:', error);
    
    // Clean up local file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Upload multiple documents
export const uploadMultipleDocuments = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const userId = req.user?.userId;
    const { category } = req.body;
    const files = req.files;
    const uploadResults = [];
    const errors = [];

    for (const file of files) {
      try {
        // Upload file to Supabase Storage
        const fileExt = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = `documents/${userId}/${fileName}`;

        const fileBuffer = fs.readFileSync(file.path);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, fileBuffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          errors.push({
            file: file.originalname,
            error: uploadError.message
          });
          fs.unlinkSync(file.path);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        // Save document metadata
        const { data: documentData, error: dbError } = await supabase
          .from('documents')
          .insert([
            {
              id: uuidv4(),
              user_id: userId,
              title: file.originalname,
              description: null,
              category: category || 'general',
              file_name: file.originalname,
              file_path: filePath,
              file_url: urlData.publicUrl,
              file_size: file.size,
              file_type: file.mimetype,
              file_extension: fileExt,
              upload_status: 'completed',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (dbError) {
          await supabase.storage.from('documents').remove([filePath]);
          errors.push({
            file: file.originalname,
            error: dbError.message
          });
        } else {
          uploadResults.push({
            document: documentData,
            file_url: urlData.publicUrl
          });
        }

        // Clean up local file
        fs.unlinkSync(file.path);

      } catch (fileError) {
        errors.push({
          file: file.originalname,
          error: fileError.message
        });
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Uploaded ${uploadResults.length} documents successfully`,
      data: {
        uploaded: uploadResults,
        errors: errors.length > 0 ? errors : null
      }
    });

  } catch (error) {
    console.error('Upload multiple documents error:', error);
    
    // Clean up any remaining local files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user documents
export const getUserDocuments = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 10, category, search } = req.query;

    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: documents, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch documents',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: {
        documents: documents || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get single document
export const getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: { document }
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update document metadata
export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { title, description, category } = req.body;

    const { data: document, error } = await supabase
      .from('documents')
      .update({
        title,
        description,
        category,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or update failed'
      });
    }

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: { document }
    });

  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Get document info first
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (dbError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete document from database',
        error: dbError.message
      });
    }

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Download document
export const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const { data: document, error } = await supabase
      .from('documents')
      .select('file_name, file_path, file_type')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Get file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (downloadError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to download file',
        error: downloadError.message
      });
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', document.file_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
