import { supabase } from '../config/db.js';
import { documentQuerySchema } from '../utils/fileValidation.js';

// Get all documents for authenticated user
export const getAllDocuments = async (req, res) => {
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
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,file_name.ilike.%${search}%`);
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
      days_since_upload: Math.floor((new Date() - new Date(doc.created_at)) / (1000 * 60 * 60 * 24)),
      can_query: doc.upload_status === 'completed' && ['application/pdf', 'text/plain'].includes(doc.file_type),
      can_extract_clauses: doc.upload_status === 'completed' && ['application/pdf', 'text/plain'].includes(doc.file_type)
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
        },
        summary: {
          total_documents: count || 0,
          accessible_documents: formattedDocuments.filter(doc => doc.is_accessible).length,
          queryable_documents: formattedDocuments.filter(doc => doc.can_query).length,
          clause_extractable_documents: formattedDocuments.filter(doc => doc.can_extract_clauses).length
        }
      }
    });

  } catch (error) {
    console.error('Get all documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get documents by status
export const getDocumentsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const userId = req.user?.userId;
    const { page = 1, limit = 10 } = req.query;

    const validStatuses = ['pending', 'processing', 'completed', 'failed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        valid_statuses: validStatuses
      });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: documents, error, count } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        file_name,
        file_size,
        file_type,
        upload_status,
        created_at
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('upload_status', status)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch documents by status',
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
      file_size_formatted: formatFileSize(doc.file_size)
    })) || [];

    res.json({
      success: true,
      data: {
        status,
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
    console.error('Get documents by status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get recent documents
export const getRecentDocuments = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { days = 7, limit = 10 } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        file_name,
        file_size,
        file_type,
        upload_status,
        created_at
      `)
      .eq('user_id', userId)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch recent documents',
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
      days_ago: Math.floor((new Date() - new Date(doc.created_at)) / (1000 * 60 * 60 * 24))
    })) || [];

    res.json({
      success: true,
      data: {
        period_days: parseInt(days),
        documents: formattedDocuments,
        total_found: formattedDocuments.length
      }
    });

  } catch (error) {
    console.error('Get recent documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get document categories summary
export const getDocumentCategories = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const { data: documents, error } = await supabase
      .from('documents')
      .select('category, file_size, upload_status')
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch document categories',
        error: error.message
      });
    }

    // Calculate category statistics
    const categoryStats = {};
    const totalSize = documents?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0;

    documents?.forEach(doc => {
      if (!categoryStats[doc.category]) {
        categoryStats[doc.category] = {
          count: 0,
          total_size: 0,
          completed: 0,
          pending: 0,
          processing: 0,
          failed: 0
        };
      }

      categoryStats[doc.category].count += 1;
      categoryStats[doc.category].total_size += doc.file_size || 0;
      categoryStats[doc.category][doc.upload_status] += 1;
    });

    // Format the response
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formattedCategories = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      count: stats.count,
      total_size: stats.total_size,
      total_size_formatted: formatFileSize(stats.total_size),
      percentage_of_total: totalSize > 0 ? ((stats.total_size / totalSize) * 100).toFixed(1) : 0,
      status_breakdown: {
        completed: stats.completed,
        pending: stats.pending,
        processing: stats.processing,
        failed: stats.failed
      }
    }));

    res.json({
      success: true,
      data: {
        categories: formattedCategories,
        total_documents: documents?.length || 0,
        total_size_formatted: formatFileSize(totalSize)
      }
    });

  } catch (error) {
    console.error('Get document categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

