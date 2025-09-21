import { supabase } from '../config/db.js';
import initializeGemini from '../config/gemini.js';

// Initialize Gemini AI
const gemini = initializeGemini();

// Get system overview dashboard
export const getSystemOverview = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 7;
    startDate.setDate(startDate.getDate() - days);

    // Get all metrics in parallel
    const [
      userMetrics,
      documentMetrics,
      queryMetrics,
      clauseMetrics,
      feedbackMetrics,
      storageMetrics,
      systemHealth
    ] = await Promise.all([
      getUserMetrics(startDate, endDate),
      getDocumentMetrics(startDate, endDate),
      getQueryMetrics(startDate, endDate),
      getClauseMetrics(startDate, endDate),
      getFeedbackMetrics(startDate, endDate),
      getStorageMetrics(),
      getSystemHealthMetrics()
    ]);

    res.json({
      success: true,
      data: {
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          days: days
        },
        overview: {
          users: userMetrics,
          documents: documentMetrics,
          queries: queryMetrics,
          clauses: clauseMetrics,
          feedback: feedbackMetrics,
          storage: storageMetrics,
          system: systemHealth
        },
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get system overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all users with detailed information
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    let query = supabase
      .from('auth.users')
      .select(`
        id,
        email,
        created_at,
        last_sign_in_at,
        email_confirmed_at,
        raw_user_meta_data
      `, { count: 'exact' });

    // Apply filters
    if (status === 'active') {
      query = query.not('last_sign_in_at', 'is', null);
    } else if (status === 'inactive') {
      query = query.is('last_sign_in_at', null);
    } else if (status === 'confirmed') {
      query = query.not('email_confirmed_at', 'is', null);
    } else if (status === 'unconfirmed') {
      query = query.is('email_confirmed_at', null);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,raw_user_meta_data->>'username'.ilike.%${search}%`);
    }

    // Apply sorting
    const validSortFields = ['created_at', 'last_sign_in_at', 'email'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const ascending = sortOrder === 'asc';
    query = query.order(sortField, { ascending });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: users, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }

    // Get additional user statistics
    const userIds = users?.map(user => user.id) || [];
    const userStats = await getUserStatistics(userIds);

    const enrichedUsers = users?.map(user => ({
      ...user,
      username: user.raw_user_meta_data?.username || 'N/A',
      full_name: user.raw_user_meta_data?.full_name || 'N/A',
      avatar_url: user.raw_user_meta_data?.avatar_url || null,
      is_active: !!user.last_sign_in_at,
      is_confirmed: !!user.email_confirmed_at,
      stats: userStats[user.id] || {
        total_documents: 0,
        total_queries: 0,
        total_clauses: 0,
        total_feedback: 0,
        last_activity: null
      }
    })) || [];

    res.json({
      success: true,
      data: {
        users: enrichedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        filters: {
          status: status || null,
          search: search || null,
          sortBy: sortField,
          sortOrder: ascending ? 'asc' : 'desc'
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user details by ID
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user basic info
    const { data: user, error: userError } = await supabase
      .from('auth.users')
      .select(`
        id,
        email,
        created_at,
        last_sign_in_at,
        email_confirmed_at,
        raw_user_meta_data
      `)
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's documents
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Get user's queries
    const { data: queries, error: queryError } = await supabase
      .from('document_queries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get user's clauses
    const { data: clauses, error: clauseError } = await supabase
      .from('document_clauses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get user's feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('query_feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate user statistics
    const totalDocuments = documents?.length || 0;
    const totalQueries = queries?.length || 0;
    const totalClauses = clauses?.length || 0;
    const totalFeedback = feedback?.length || 0;

    const totalStorage = documents?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0;
    const averageQueryRating = feedback?.length > 0 ? 
      feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length : 0;

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          username: user.raw_user_meta_data?.username || 'N/A',
          full_name: user.raw_user_meta_data?.full_name || 'N/A',
          avatar_url: user.raw_user_meta_data?.avatar_url || null,
          is_active: !!user.last_sign_in_at,
          is_confirmed: !!user.email_confirmed_at
        },
        statistics: {
          total_documents: totalDocuments,
          total_queries: totalQueries,
          total_clauses: totalClauses,
          total_feedback: totalFeedback,
          total_storage_bytes: totalStorage,
          total_storage_formatted: formatFileSize(totalStorage),
          average_query_rating: parseFloat(averageQueryRating.toFixed(2)),
          last_activity: getLastActivity(documents, queries, clauses, feedback)
        },
        recent_activity: {
          documents: documents?.slice(0, 5) || [],
          queries: queries?.slice(0, 5) || [],
          clauses: clauses?.slice(0, 5) || [],
          feedback: feedback?.slice(0, 5) || []
        }
      }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get system analytics
export const getSystemAnalytics = async (req, res) => {
  try {
    const { period = '30d', granularity = 'daily' } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
    startDate.setDate(startDate.getDate() - days);

    // Get time series data
    const [
      userGrowth,
      documentUploads,
      queryActivity,
      storageUsage,
      feedbackTrends
    ] = await Promise.all([
      getUserGrowthData(startDate, endDate, granularity),
      getDocumentUploadData(startDate, endDate, granularity),
      getQueryActivityData(startDate, endDate, granularity),
      getStorageUsageData(startDate, endDate, granularity),
      getFeedbackTrendsData(startDate, endDate, granularity)
    ]);

    res.json({
      success: true,
      data: {
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          days: days,
          granularity: granularity
        },
        analytics: {
          user_growth: userGrowth,
          document_uploads: documentUploads,
          query_activity: queryActivity,
          storage_usage: storageUsage,
          feedback_trends: feedbackTrends
        },
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get system analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get file handling statistics
export const getFileHandlingStats = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 7;
    startDate.setDate(startDate.getDate() - days);

    // Get file statistics
    const { data: fileStats, error: fileError } = await supabase
      .from('documents')
      .select('file_type, file_size, upload_status, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (fileError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch file statistics',
        error: fileError.message
      });
    }

    // Process file statistics
    const fileTypeStats = {};
    const statusStats = {};
    const sizeStats = {
      total: 0,
      average: 0,
      largest: 0,
      smallest: Infinity
    };

    fileStats?.forEach(file => {
      // File type statistics
      fileTypeStats[file.file_type] = (fileTypeStats[file.file_type] || 0) + 1;
      
      // Status statistics
      statusStats[file.upload_status] = (statusStats[file.upload_status] || 0) + 1;
      
      // Size statistics
      const size = file.file_size || 0;
      sizeStats.total += size;
      if (size > sizeStats.largest) sizeStats.largest = size;
      if (size < sizeStats.smallest && size > 0) sizeStats.smallest = size;
    });

    sizeStats.average = fileStats?.length > 0 ? sizeStats.total / fileStats.length : 0;

    // Get storage usage by user
    const { data: userStorage, error: userStorageError } = await supabase
      .from('documents')
      .select('user_id, file_size')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const userStorageStats = {};
    userStorage?.forEach(doc => {
      userStorageStats[doc.user_id] = (userStorageStats[doc.user_id] || 0) + (doc.file_size || 0);
    });

    const topUsersByStorage = Object.entries(userStorageStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([userId, size]) => ({ user_id: userId, storage_bytes: size, storage_formatted: formatFileSize(size) }));

    res.json({
      success: true,
      data: {
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          days: days
        },
        file_statistics: {
          total_files: fileStats?.length || 0,
          file_types: fileTypeStats,
          upload_status: statusStats,
          size_statistics: {
            total_bytes: sizeStats.total,
            total_formatted: formatFileSize(sizeStats.total),
            average_bytes: sizeStats.average,
            average_formatted: formatFileSize(sizeStats.average),
            largest_bytes: sizeStats.largest,
            largest_formatted: formatFileSize(sizeStats.largest),
            smallest_bytes: sizeStats.smallest === Infinity ? 0 : sizeStats.smallest,
            smallest_formatted: formatFileSize(sizeStats.smallest === Infinity ? 0 : sizeStats.smallest)
          }
        },
        top_users_by_storage: topUsersByStorage,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get file handling stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin actions
export const performAdminAction = async (req, res) => {
  try {
    const { action, targetId, reason } = req.body;
    const adminId = req.user?.userId;

    const validActions = ['suspend_user', 'activate_user', 'delete_user', 'reset_user_password', 'cleanup_orphaned_files'];

    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action',
        valid_actions: validActions
      });
    }

    let result;

    switch (action) {
      case 'suspend_user':
        result = await suspendUser(targetId, reason, adminId);
        break;
      case 'activate_user':
        result = await activateUser(targetId, reason, adminId);
        break;
      case 'delete_user':
        result = await deleteUser(targetId, reason, adminId);
        break;
      case 'reset_user_password':
        result = await resetUserPassword(targetId, reason, adminId);
        break;
      case 'cleanup_orphaned_files':
        result = await cleanupOrphanedFiles(adminId);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Action not implemented'
        });
    }

    res.json({
      success: true,
      message: `Action '${action}' completed successfully`,
      data: result
    });

  } catch (error) {
    console.error('Perform admin action error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper functions
const getUserMetrics = async (startDate, endDate) => {
  try {
    const { count: totalUsers, error: totalError } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true });

    const { count: newUsers, error: newError } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const { count: activeUsers, error: activeError } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
      .not('last_sign_in_at', 'is', null)
      .gte('last_sign_in_at', startDate.toISOString());

    return {
      total_users: totalUsers || 0,
      new_users: newUsers || 0,
      active_users: activeUsers || 0,
      error: totalError || newError || activeError
    };
  } catch (error) {
    return { error: error.message };
  }
};

const getDocumentMetrics = async (startDate, endDate) => {
  try {
    const { count: totalDocs, error: totalError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });

    const { count: newDocs, error: newError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const { data: statusData, error: statusError } = await supabase
      .from('documents')
      .select('upload_status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const statusCounts = statusData?.reduce((acc, doc) => {
      acc[doc.upload_status] = (acc[doc.upload_status] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      total_documents: totalDocs || 0,
      new_documents: newDocs || 0,
      status_breakdown: statusCounts,
      error: totalError || newError || statusError
    };
  } catch (error) {
    return { error: error.message };
  }
};

const getQueryMetrics = async (startDate, endDate) => {
  try {
    const { count: totalQueries, error: totalError } = await supabase
      .from('document_queries')
      .select('*', { count: 'exact', head: true });

    const { count: newQueries, error: newError } = await supabase
      .from('document_queries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return {
      total_queries: totalQueries || 0,
      new_queries: newQueries || 0,
      error: totalError || newError
    };
  } catch (error) {
    return { error: error.message };
  }
};

const getClauseMetrics = async (startDate, endDate) => {
  try {
    const { count: totalClauses, error: totalError } = await supabase
      .from('document_clauses')
      .select('*', { count: 'exact', head: true });

    const { count: newClauses, error: newError } = await supabase
      .from('document_clauses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return {
      total_clauses: totalClauses || 0,
      new_clauses: newClauses || 0,
      error: totalError || newError
    };
  } catch (error) {
    return { error: error.message };
  }
};

const getFeedbackMetrics = async (startDate, endDate) => {
  try {
    const { count: totalFeedback, error: totalError } = await supabase
      .from('query_feedback')
      .select('*', { count: 'exact', head: true });

    const { count: newFeedback, error: newError } = await supabase
      .from('query_feedback')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const { data: ratingData, error: ratingError } = await supabase
      .from('query_feedback')
      .select('rating')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const averageRating = ratingData?.length > 0 ? 
      ratingData.reduce((acc, f) => acc + f.rating, 0) / ratingData.length : 0;

    return {
      total_feedback: totalFeedback || 0,
      new_feedback: newFeedback || 0,
      average_rating: parseFloat(averageRating.toFixed(2)),
      error: totalError || newError || ratingError
    };
  } catch (error) {
    return { error: error.message };
  }
};

const getStorageMetrics = async () => {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('file_size, created_at');

    if (error) return { error: error.message };

    const totalSize = documents?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0;
    const fileCount = documents?.length || 0;

    return {
      total_storage_bytes: totalSize,
      total_storage_formatted: formatFileSize(totalSize),
      total_files: fileCount,
      average_file_size: fileCount > 0 ? totalSize / fileCount : 0,
      average_file_size_formatted: formatFileSize(fileCount > 0 ? totalSize / fileCount : 0)
    };
  } catch (error) {
    return { error: error.message };
  }
};

const getSystemHealthMetrics = async () => {
  try {
    // Test database connection
    const { error: dbError } = await supabase
      .from('documents')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    // Test storage connection
    const { error: storageError } = await supabase.storage
      .from('documents')
      .list('', { limit: 1 });

    // Test Gemini connection
    const gemini = initializeGemini();
    const geminiTest = await gemini.testConnection();

    return {
      database_status: dbError ? 'error' : 'healthy',
      storage_status: storageError ? 'error' : 'healthy',
      ai_status: geminiTest.success ? 'healthy' : 'error',
      overall_status: (dbError || storageError || !geminiTest.success) ? 'degraded' : 'healthy'
    };
  } catch (error) {
    return { error: error.message, overall_status: 'error' };
  }
};

const getUserStatistics = async (userIds) => {
  if (userIds.length === 0) return {};

  try {
    const [docStats, queryStats, clauseStats, feedbackStats] = await Promise.all([
      supabase.from('documents').select('user_id').in('user_id', userIds),
      supabase.from('document_queries').select('user_id').in('user_id', userIds),
      supabase.from('document_clauses').select('user_id').in('user_id', userIds),
      supabase.from('query_feedback').select('user_id').in('user_id', userIds)
    ]);

    const stats = {};
    userIds.forEach(userId => {
      stats[userId] = {
        total_documents: docStats.data?.filter(d => d.user_id === userId).length || 0,
        total_queries: queryStats.data?.filter(q => q.user_id === userId).length || 0,
        total_clauses: clauseStats.data?.filter(c => c.user_id === userId).length || 0,
        total_feedback: feedbackStats.data?.filter(f => f.user_id === userId).length || 0,
        last_activity: null
      };
    });

    return stats;
  } catch (error) {
    console.error('Get user statistics error:', error);
    return {};
  }
};

const getLastActivity = (documents, queries, clauses, feedback) => {
  const allActivities = [
    ...(documents || []).map(d => ({ date: d.created_at, type: 'document' })),
    ...(queries || []).map(q => ({ date: q.created_at, type: 'query' })),
    ...(clauses || []).map(c => ({ date: c.created_at, type: 'clause' })),
    ...(feedback || []).map(f => ({ date: f.created_at, type: 'feedback' }))
  ];

  if (allActivities.length === 0) return null;

  const latest = allActivities.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  return {
    type: latest.type,
    date: latest.date
  };
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Time series data functions (simplified for now)
const getUserGrowthData = async (startDate, endDate, granularity) => {
  // Implementation would depend on specific requirements
  return { data: [], labels: [] };
};

const getDocumentUploadData = async (startDate, endDate, granularity) => {
  // Implementation would depend on specific requirements
  return { data: [], labels: [] };
};

const getQueryActivityData = async (startDate, endDate, granularity) => {
  // Implementation would depend on specific requirements
  return { data: [], labels: [] };
};

const getStorageUsageData = async (startDate, endDate, granularity) => {
  // Implementation would depend on specific requirements
  return { data: [], labels: [] };
};

const getFeedbackTrendsData = async (startDate, endDate, granularity) => {
  // Implementation would depend on specific requirements
  return { data: [], labels: [] };
};

// Admin action implementations
const suspendUser = async (userId, reason, adminId) => {
  // Implementation for suspending user
  return { action: 'suspend_user', target_id: userId, reason, admin_id: adminId };
};

const activateUser = async (userId, reason, adminId) => {
  // Implementation for activating user
  return { action: 'activate_user', target_id: userId, reason, admin_id: adminId };
};

const deleteUser = async (userId, reason, adminId) => {
  // Implementation for deleting user
  return { action: 'delete_user', target_id: userId, reason, admin_id: adminId };
};

const resetUserPassword = async (userId, reason, adminId) => {
  // Implementation for resetting user password
  return { action: 'reset_user_password', target_id: userId, reason, admin_id: adminId };
};

const cleanupOrphanedFiles = async (adminId) => {
  // Implementation for cleaning up orphaned files
  return { action: 'cleanup_orphaned_files', admin_id: adminId };
};

