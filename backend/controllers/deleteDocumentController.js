import { supabase } from '../config/db.js';

// Delete single document
export const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.userId;

    // Get document info first
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path, title, file_name')
      .eq('id', documentId)
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
      // Continue with database deletion even if storage deletion fails
    }

    // Delete related data first (due to foreign key constraints)
    await Promise.all([
      // Delete document queries
      supabase
        .from('document_queries')
        .delete()
        .eq('document_id', documentId),
      
      // Delete document clauses
      supabase
        .from('document_clauses')
        .delete()
        .eq('document_id', documentId),
      
      // Delete document feedback
      supabase
        .from('document_feedback')
        .delete()
        .eq('document_id', documentId)
    ]);

    // Delete from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
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
      message: 'Document deleted successfully',
      data: {
        document_id: documentId,
        document_title: document.title,
        file_name: document.file_name,
        deleted_at: new Date().toISOString()
      }
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

// Delete multiple documents
export const deleteMultipleDocuments = async (req, res) => {
  try {
    const { documentIds } = req.body;
    const userId = req.user?.userId;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Document IDs array is required'
      });
    }

    if (documentIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete more than 50 documents at once'
      });
    }

    // Get documents info first
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('id, file_path, title, file_name')
      .eq('user_id', userId)
      .in('id', documentIds);

    if (fetchError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch documents',
        error: fetchError.message
      });
    }

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No documents found to delete'
      });
    }

    const deletedDocuments = [];
    const errors = [];

    // Delete each document
    for (const document of documents) {
      try {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([document.file_path]);

        if (storageError) {
          console.error(`Storage deletion error for ${document.id}:`, storageError);
        }

        // Delete related data
        await Promise.all([
          supabase
            .from('document_queries')
            .delete()
            .eq('document_id', document.id),
          
          supabase
            .from('document_clauses')
            .delete()
            .eq('document_id', document.id),
          
          supabase
            .from('document_feedback')
            .delete()
            .eq('document_id', document.id)
        ]);

        // Delete from database
        const { error: dbError } = await supabase
          .from('documents')
          .delete()
          .eq('id', document.id)
          .eq('user_id', userId);

        if (dbError) {
          errors.push({
            document_id: document.id,
            error: dbError.message
          });
        } else {
          deletedDocuments.push({
            document_id: document.id,
            title: document.title,
            file_name: document.file_name
          });
        }

      } catch (docError) {
        errors.push({
          document_id: document.id,
          error: docError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Deleted ${deletedDocuments.length} documents successfully`,
      data: {
        deleted_documents: deletedDocuments,
        errors: errors.length > 0 ? errors : null,
        summary: {
          requested: documentIds.length,
          deleted: deletedDocuments.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    console.error('Delete multiple documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete documents by category
export const deleteDocumentsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user?.userId;
    const { confirm = false } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Set confirm: true in request body.'
      });
    }

    const validCategories = ['general', 'work', 'personal', 'education', 'legal', 'medical', 'financial', 'other'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category',
        valid_categories: validCategories
      });
    }

    // Get documents in this category
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('id, file_path, title, file_name')
      .eq('user_id', userId)
      .eq('category', category);

    if (fetchError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch documents by category',
        error: fetchError.message
      });
    }

    if (documents.length === 0) {
      return res.json({
        success: true,
        message: 'No documents found in this category',
        data: {
          category,
          deleted_count: 0
        }
      });
    }

    const deletedDocuments = [];
    const errors = [];

    // Delete each document
    for (const document of documents) {
      try {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([document.file_path]);

        if (storageError) {
          console.error(`Storage deletion error for ${document.id}:`, storageError);
        }

        // Delete related data
        await Promise.all([
          supabase
            .from('document_queries')
            .delete()
            .eq('document_id', document.id),
          
          supabase
            .from('document_clauses')
            .delete()
            .eq('document_id', document.id),
          
          supabase
            .from('document_feedback')
            .delete()
            .eq('document_id', document.id)
        ]);

        // Delete from database
        const { error: dbError } = await supabase
          .from('documents')
          .delete()
          .eq('id', document.id)
          .eq('user_id', userId);

        if (dbError) {
          errors.push({
            document_id: document.id,
            error: dbError.message
          });
        } else {
          deletedDocuments.push({
            document_id: document.id,
            title: document.title,
            file_name: document.file_name
          });
        }

      } catch (docError) {
        errors.push({
          document_id: document.id,
          error: docError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Deleted ${deletedDocuments.length} documents from category '${category}'`,
      data: {
        category,
        deleted_documents: deletedDocuments,
        errors: errors.length > 0 ? errors : null,
        summary: {
          total_in_category: documents.length,
          deleted: deletedDocuments.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    console.error('Delete documents by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get deletion preview (show what will be deleted)
export const getDeletionPreview = async (req, res) => {
  try {
    const { documentIds, category } = req.query;
    const userId = req.user?.userId;

    let query = supabase
      .from('documents')
      .select(`
        id,
        title,
        file_name,
        file_size,
        file_type,
        category,
        upload_status,
        created_at
      `)
      .eq('user_id', userId);

    if (documentIds) {
      const ids = documentIds.split(',');
      query = query.in('id', ids);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: documents, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch documents for preview',
        error: error.message
      });
    }

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const totalSize = documents?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        documents: documents?.map(doc => ({
          ...doc,
          file_size_formatted: formatFileSize(doc.file_size)
        })) || [],
        summary: {
          total_documents: documents?.length || 0,
          total_size: totalSize,
          total_size_formatted: formatFileSize(totalSize),
          categories: [...new Set(documents?.map(doc => doc.category) || [])],
          status_breakdown: documents?.reduce((acc, doc) => {
            acc[doc.upload_status] = (acc[doc.upload_status] || 0) + 1;
            return acc;
          }, {}) || {}
        },
        warning: documents && documents.length > 0 ? 
          `This will permanently delete ${documents.length} document(s) and all associated data (queries, clauses, feedback). This action cannot be undone.` : 
          'No documents found matching the criteria.'
      }
    });

  } catch (error) {
    console.error('Get deletion preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

