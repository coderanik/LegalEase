import { supabase } from '../config/db.js';
import { documentQuerySchema } from '../utils/fileValidation.js';
import { getDocumentAnalytics, getDocumentTrends, getDocumentPerformance } from '../utils/documentAnalytics.js';

// Get document metadata by ID
export const getDocumentMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const { data: document, error } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        description,
        category,
        file_name,
        file_url,
        file_size,
        file_type,
        file_extension,
        upload_status,
        created_at,
        updated_at,
        user_id
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Format file size for display
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    res.json({
      success: true,
      data: {
        document: {
          ...document,
          file_size_formatted: formatFileSize(document.file_size),
          is_accessible: document.upload_status === 'completed'
        }
      }
    });

  } catch (error) {
    console.error('Get document metadata error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get document status
export const getDocumentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const { data: document, error } = await supabase
      .from('documents')
      .select('id, title, upload_status, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Determine status message
    let statusMessage = '';
    switch (document.upload_status) {
      case 'pending':
        statusMessage = 'Document is queued for processing';
        break;
      case 'processing':
        statusMessage = 'Document is being processed';
        break;
      case 'completed':
        statusMessage = 'Document is ready for use';
        break;
      case 'failed':
        statusMessage = 'Document processing failed';
        break;
      default:
        statusMessage = 'Unknown status';
    }

    res.json({
      success: true,
      data: {
        document_id: document.id,
        title: document.title,
        status: document.upload_status,
        status_message: statusMessage,
        created_at: document.created_at,
        updated_at: document.updated_at,
        is_ready: document.upload_status === 'completed'
      }
    });

  } catch (error) {
    console.error('Get document status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all documents with metadata and pagination
export const getAllDocumentsMetadata = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    // Validate query parameters
    const { error: validationError, value } = documentQuerySchema.validate(req.query);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationError.details.map(detail => detail.message)
      });
    }

    const { page, limit, category, search } = value;

    let query = supabase
      .from('documents')
      .select(`
        id,
        title,
        description,
        category,
        file_name,
        file_url,
        file_size,
        file_type,
        file_extension,
        upload_status,
        created_at,
        updated_at
      `, { count: 'exact' })
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

    // Format file sizes and add additional metadata
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formattedDocuments = documents?.map(doc => ({
      ...doc,
      file_size_formatted: formatFileSize(doc.file_size),
      is_accessible: doc.upload_status === 'completed',
      days_since_upload: Math.floor((new Date() - new Date(doc.created_at)) / (1000 * 60 * 60 * 24))
    })) || [];

    res.json({
      success: true,
      data: {
        documents: formattedDocuments,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        filters: {
          category: category || null,
          search: search || null
        }
      }
    });

  } catch (error) {
    console.error('Get all documents metadata error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get documents by category
export const getDocumentsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user?.userId;
    const { page = 1, limit = 10 } = req.query;

    const validCategories = ['general', 'work', 'personal', 'education', 'legal', 'medical', 'financial', 'other'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category',
        valid_categories: validCategories
      });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: documents, error, count } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        description,
        file_name,
        file_url,
        file_size,
        file_type,
        upload_status,
        created_at
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch documents by category',
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

    const formattedDocuments = documents?.map(doc => ({
      ...doc,
      file_size_formatted: formatFileSize(doc.file_size),
      is_accessible: doc.upload_status === 'completed'
    })) || [];

    res.json({
      success: true,
      data: {
        category,
        documents: formattedDocuments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get documents by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get document statistics
export const getDocumentStatistics = async (req, res) => {
  try {
    const userId = req.user?.userId;

    // Get total documents count
    const { count: totalDocuments, error: totalError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (totalError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch document statistics',
        error: totalError.message
      });
    }

    // Get documents by status
    const { data: statusData, error: statusError } = await supabase
      .from('documents')
      .select('upload_status')
      .eq('user_id', userId);

    if (statusError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch status statistics',
        error: statusError.message
      });
    }

    // Get documents by category
    const { data: categoryData, error: categoryError } = await supabase
      .from('documents')
      .select('category, file_size')
      .eq('user_id', userId);

    if (categoryError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch category statistics',
        error: categoryError.message
      });
    }

    // Calculate statistics
    const statusCounts = statusData?.reduce((acc, doc) => {
      acc[doc.upload_status] = (acc[doc.upload_status] || 0) + 1;
      return acc;
    }, {}) || {};

    const categoryCounts = categoryData?.reduce((acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    }, {}) || {};

    const totalSize = categoryData?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0;

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Get recent uploads (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentUploads, error: recentError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString());

    res.json({
      success: true,
      data: {
        total_documents: totalDocuments || 0,
        total_size: formatFileSize(totalSize),
        recent_uploads: recentUploads || 0,
        status_breakdown: {
          completed: statusCounts.completed || 0,
          pending: statusCounts.pending || 0,
          processing: statusCounts.processing || 0,
          failed: statusCounts.failed || 0
        },
        category_breakdown: categoryCounts,
        average_file_size: totalDocuments > 0 ? formatFileSize(totalSize / totalDocuments) : '0 Bytes'
      }
    });

  } catch (error) {
    console.error('Get document statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Search documents
export const searchDocuments = async (req, res) => {
  try {
    const { q: searchTerm, category, page = 1, limit = 10 } = req.query;
    const userId = req.user?.userId;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters long'
      });
    }

    let query = supabase
      .from('documents')
      .select(`
        id,
        title,
        description,
        category,
        file_name,
        file_url,
        file_size,
        file_type,
        upload_status,
        created_at
      `, { count: 'exact' })
      .eq('user_id', userId)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,file_name.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: documents, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Search failed',
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

    const formattedDocuments = documents?.map(doc => ({
      ...doc,
      file_size_formatted: formatFileSize(doc.file_size),
      is_accessible: doc.upload_status === 'completed'
    })) || [];

    res.json({
      success: true,
      data: {
        search_term: searchTerm,
        documents: formattedDocuments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        filters: {
          category: category || null
        }
      }
    });

  } catch (error) {
    console.error('Search documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get document analytics for a specific period
export const getDocumentAnalyticsPeriod = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
        example: '?start_date=2024-01-01&end_date=2024-01-31'
      });
    }

    const analytics = await getDocumentAnalytics(userId, start_date, end_date);

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: analytics.error
      });
    }

    res.json(analytics);

  } catch (error) {
    console.error('Get document analytics period error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get document trends
export const getDocumentTrendsData = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { days = 30 } = req.query;

    const trends = await getDocumentTrends(userId, parseInt(days));

    if (!trends.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch trends',
        error: trends.error
      });
    }

    res.json(trends);

  } catch (error) {
    console.error('Get document trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get document performance metrics
export const getDocumentPerformanceData = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const performance = await getDocumentPerformance(userId);

    if (!performance.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch performance data',
        error: performance.error
      });
    }

    res.json(performance);

  } catch (error) {
    console.error('Get document performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
