import { supabase } from '../config/db.js';

// Get document analytics for a specific time period
export const getDocumentAnalytics = async (userId, startDate, endDate) => {
  try {
    // Get documents created in the specified time period
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    // Calculate analytics
    const analytics = {
      total_documents: documents?.length || 0,
      total_size: 0,
      status_breakdown: {},
      category_breakdown: {},
      file_type_breakdown: {},
      daily_uploads: {},
      average_file_size: 0,
      largest_file: null,
      smallest_file: null
    };

    if (documents && documents.length > 0) {
      // Calculate total size and other metrics
      let totalSize = 0;
      let largestSize = 0;
      let smallestSize = Infinity;

      documents.forEach(doc => {
        // Total size
        totalSize += doc.file_size || 0;

        // Largest and smallest files
        if (doc.file_size > largestSize) {
          largestSize = doc.file_size;
          analytics.largest_file = {
            id: doc.id,
            title: doc.title,
            file_name: doc.file_name,
            size: doc.file_size,
            size_formatted: formatFileSize(doc.file_size)
          };
        }

        if (doc.file_size < smallestSize && doc.file_size > 0) {
          smallestSize = doc.file_size;
          analytics.smallest_file = {
            id: doc.id,
            title: doc.title,
            file_name: doc.file_name,
            size: doc.file_size,
            size_formatted: formatFileSize(doc.file_size)
          };
        }

        // Status breakdown
        analytics.status_breakdown[doc.upload_status] = 
          (analytics.status_breakdown[doc.upload_status] || 0) + 1;

        // Category breakdown
        analytics.category_breakdown[doc.category] = 
          (analytics.category_breakdown[doc.category] || 0) + 1;

        // File type breakdown
        analytics.file_type_breakdown[doc.file_type] = 
          (analytics.file_type_breakdown[doc.file_type] || 0) + 1;

        // Daily uploads
        const uploadDate = new Date(doc.created_at).toISOString().split('T')[0];
        analytics.daily_uploads[uploadDate] = 
          (analytics.daily_uploads[uploadDate] || 0) + 1;
      });

      analytics.total_size = totalSize;
      analytics.average_file_size = totalSize / documents.length;
    }

    return {
      success: true,
      data: {
        ...analytics,
        total_size_formatted: formatFileSize(analytics.total_size),
        average_file_size_formatted: formatFileSize(analytics.average_file_size),
        period: {
          start_date: startDate,
          end_date: endDate
        }
      }
    };

  } catch (error) {
    console.error('Document analytics error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get document trends over time
export const getDocumentTrends = async (userId, days = 30) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: documents, error } = await supabase
      .from('documents')
      .select('created_at, upload_status, file_size, category')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    // Group by day
    const dailyData = {};
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyData[dateStr] = {
        date: dateStr,
        uploads: 0,
        total_size: 0,
        completed: 0,
        failed: 0,
        categories: {}
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate with actual data
    documents?.forEach(doc => {
      const dateStr = new Date(doc.created_at).toISOString().split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].uploads += 1;
        dailyData[dateStr].total_size += doc.file_size || 0;
        
        if (doc.upload_status === 'completed') {
          dailyData[dateStr].completed += 1;
        } else if (doc.upload_status === 'failed') {
          dailyData[dateStr].failed += 1;
        }

        dailyData[dateStr].categories[doc.category] = 
          (dailyData[dateStr].categories[doc.category] || 0) + 1;
      }
    });

    // Convert to array and format
    const trends = Object.values(dailyData).map(day => ({
      ...day,
      total_size_formatted: formatFileSize(day.total_size),
      success_rate: day.uploads > 0 ? ((day.completed / day.uploads) * 100).toFixed(1) : 0
    }));

    return {
      success: true,
      data: {
        trends,
        summary: {
          total_days: days,
          total_uploads: documents?.length || 0,
          average_daily_uploads: documents ? (documents.length / days).toFixed(2) : 0,
          total_size: documents?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0
        }
      }
    };

  } catch (error) {
    console.error('Document trends error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get document performance metrics
export const getDocumentPerformance = async (userId) => {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('upload_status, created_at, updated_at, file_size, file_type')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    const performance = {
      total_documents: documents?.length || 0,
      success_rate: 0,
      average_processing_time: 0,
      file_type_performance: {},
      size_performance: {
        small_files: 0,    // < 1MB
        medium_files: 0,   // 1MB - 10MB
        large_files: 0     // > 10MB
      },
      processing_times: []
    };

    if (documents && documents.length > 0) {
      let completedCount = 0;
      let totalProcessingTime = 0;
      let processingTimeCount = 0;

      documents.forEach(doc => {
        // Success rate
        if (doc.upload_status === 'completed') {
          completedCount++;
        }

        // Processing time calculation
        if (doc.upload_status === 'completed' && doc.created_at && doc.updated_at) {
          const created = new Date(doc.created_at);
          const updated = new Date(doc.updated_at);
          const processingTime = (updated - created) / 1000; // in seconds
          
          if (processingTime > 0) {
            totalProcessingTime += processingTime;
            processingTimeCount++;
            performance.processing_times.push({
              file_type: doc.file_type,
              file_size: doc.file_size,
              processing_time: processingTime
            });
          }
        }

        // File type performance
        performance.file_type_performance[doc.file_type] = 
          (performance.file_type_performance[doc.file_type] || 0) + 1;

        // Size performance
        const sizeInMB = (doc.file_size || 0) / (1024 * 1024);
        if (sizeInMB < 1) {
          performance.size_performance.small_files++;
        } else if (sizeInMB <= 10) {
          performance.size_performance.medium_files++;
        } else {
          performance.size_performance.large_files++;
        }
      });

      performance.success_rate = (completedCount / documents.length) * 100;
      performance.average_processing_time = processingTimeCount > 0 
        ? totalProcessingTime / processingTimeCount 
        : 0;
    }

    return {
      success: true,
      data: {
        ...performance,
        success_rate_formatted: `${performance.success_rate.toFixed(1)}%`,
        average_processing_time_formatted: `${performance.average_processing_time.toFixed(2)} seconds`
      }
    };

  } catch (error) {
    console.error('Document performance error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default {
  getDocumentAnalytics,
  getDocumentTrends,
  getDocumentPerformance
};
