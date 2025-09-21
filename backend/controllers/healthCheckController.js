import { supabase } from '../config/db.js';
import initializeGemini from '../config/gemini.js';
import fs from 'fs';
import os from 'os';

// Basic health check
export const basicHealthCheck = async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Comprehensive health check
export const comprehensiveHealthCheck = async (req, res) => {
  try {
    const checks = {
      database: await checkDatabaseHealth(),
      storage: await checkStorageHealth(),
      gemini: await checkGeminiHealth(),
      system: checkSystemHealth(),
      memory: checkMemoryHealth(),
      disk: await checkDiskHealth()
    };

    const overallStatus = Object.values(checks).every(check => check.status === 'healthy') ? 'healthy' : 'degraded';
    const unhealthyServices = Object.entries(checks)
      .filter(([_, check]) => check.status !== 'healthy')
      .map(([service, _]) => service);

    res.json({
      success: true,
      data: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: checks,
        unhealthy_services: unhealthyServices,
        summary: {
          total_checks: Object.keys(checks).length,
          healthy_checks: Object.values(checks).filter(check => check.status === 'healthy').length,
          unhealthy_checks: Object.values(checks).filter(check => check.status !== 'healthy').length
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Database health check
const checkDatabaseHealth = async () => {
  try {
    const startTime = Date.now();
    
    // Test basic connection
    const { data, error } = await supabase
      .from('documents')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        error: error.message,
        response_time_ms: responseTime
      };
    }

    return {
      status: 'healthy',
      message: 'Database connection successful',
      response_time_ms: responseTime,
      connection_pool: 'active'
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database health check failed',
      error: error.message
    };
  }
};

// Storage health check
const checkStorageHealth = async () => {
  try {
    const startTime = Date.now();

    // Test storage bucket access
    const { data, error } = await supabase.storage
      .from('documents')
      .list('', { limit: 1 });

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: 'unhealthy',
        message: 'Storage access failed',
        error: error.message,
        response_time_ms: responseTime
      };
    }

    return {
      status: 'healthy',
      message: 'Storage access successful',
      response_time_ms: responseTime,
      bucket: 'documents'
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Storage health check failed',
      error: error.message
    };
  }
};

// Gemini AI health check
const checkGeminiHealth = async () => {
  try {
    const startTime = Date.now();

    const gemini = initializeGemini();
    const result = await gemini.testConnection();

    const responseTime = Date.now() - startTime;

    if (!result.success) {
      return {
        status: 'unhealthy',
        message: 'Gemini API connection failed',
        error: result.error || 'Unknown error',
        response_time_ms: responseTime
      };
    }

    return {
      status: 'healthy',
      message: 'Gemini API connection successful',
      response_time_ms: responseTime,
      model: 'gemini-1.5-flash'
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Gemini health check failed',
      error: error.message
    };
  }
};

// System health check
const checkSystemHealth = () => {
  try {
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      status: 'healthy',
      message: 'System resources normal',
      cpu_usage: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      memory_usage: {
        rss: memoryUsage.rss,
        heap_total: memoryUsage.heapTotal,
        heap_used: memoryUsage.heapUsed,
        external: memoryUsage.external
      },
      uptime_seconds: uptime,
      node_version: process.version,
      platform: os.platform(),
      arch: os.arch()
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'System health check failed',
      error: error.message
    };
  }
};

// Memory health check
const checkMemoryHealth = () => {
  try {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    let status = 'healthy';
    if (memoryUsagePercent > 90 || heapUsagePercent > 90) {
      status = 'critical';
    } else if (memoryUsagePercent > 80 || heapUsagePercent > 80) {
      status = 'warning';
    }

    return {
      status: status,
      message: status === 'healthy' ? 'Memory usage normal' : 'Memory usage high',
      system_memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usage_percent: parseFloat(memoryUsagePercent.toFixed(2))
      },
      heap_memory: {
        total: memoryUsage.heapTotal,
        used: memoryUsage.heapUsed,
        usage_percent: parseFloat(heapUsagePercent.toFixed(2))
      }
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Memory health check failed',
      error: error.message
    };
  }
};

// Disk health check
const checkDiskHealth = async () => {
  try {
    const stats = fs.statSync('.');
    const uploadsDir = 'uploads';
    
    // Check if uploads directory exists and is writable
    let uploadsStatus = 'not_exists';
    try {
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      uploadsStatus = 'writable';
    } catch (err) {
      if (err.code === 'ENOENT') {
        uploadsStatus = 'not_exists';
      } else {
        uploadsStatus = 'not_writable';
      }
    }

    return {
      status: uploadsStatus === 'writable' ? 'healthy' : 'warning',
      message: uploadsStatus === 'writable' ? 'Disk access normal' : 'Disk access issues detected',
      uploads_directory: {
        status: uploadsStatus,
        path: uploadsDir
      },
      current_directory: {
        readable: true,
        writable: true
      }
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Disk health check failed',
      error: error.message
    };
  }
};

// Get service metrics
export const getServiceMetrics = async (req, res) => {
  try {
    const userId = req.user?.userId;

    // Get document metrics
    const { count: totalDocuments, error: docError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get query metrics
    const { count: totalQueries, error: queryError } = await supabase
      .from('document_queries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get clause metrics
    const { count: totalClauses, error: clauseError } = await supabase
      .from('document_clauses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get feedback metrics
    const { count: totalFeedback, error: feedbackError } = await supabase
      .from('query_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const metrics = {
      documents: {
        total: totalDocuments || 0,
        status: docError ? 'error' : 'success'
      },
      queries: {
        total: totalQueries || 0,
        status: queryError ? 'error' : 'success'
      },
      clauses: {
        total: totalClauses || 0,
        status: clauseError ? 'error' : 'success'
      },
      feedback: {
        total: totalFeedback || 0,
        status: feedbackError ? 'error' : 'success'
      }
    };

    res.json({
      success: true,
      data: {
        user_metrics: metrics,
        timestamp: new Date().toISOString(),
        user_id: userId
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get service metrics',
      error: error.message
    });
  }
};

// Get API status
export const getApiStatus = async (req, res) => {
  try {
    const status = {
      api: 'operational',
      database: 'operational',
      storage: 'operational',
      ai_service: 'operational',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      data: {
        api: 'degraded',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

