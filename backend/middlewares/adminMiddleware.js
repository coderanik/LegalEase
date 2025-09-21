import { supabase } from '../config/db.js';

// Admin authentication middleware
export const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify JWT token
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists in Supabase
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user || user.id !== decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Check if user has admin role
    const isAdmin = await checkAdminRole(user.id);
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        error: 'Insufficient permissions'
      });
    }

    // Add user info to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      isAdmin: true
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Super admin middleware (for critical operations)
export const requireSuperAdmin = async (req, res, next) => {
  try {
    // First check if user is admin
    await requireAdmin(req, res, async () => {
      try {
        const userId = req.user?.userId;
        
        // Check if user has super admin role
        const isSuperAdmin = await checkSuperAdminRole(userId);
        
        if (!isSuperAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Super admin access required',
            error: 'Insufficient permissions for this operation'
          });
        }

        // Add super admin flag
        req.user.isSuperAdmin = true;
        next();
      } catch (error) {
        console.error('Super admin check error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  } catch (error) {
    console.error('Super admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Admin action logging middleware
export const logAdminAction = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log admin action after response is sent
      if (req.user?.isAdmin && req.method !== 'GET') {
        logActionToDatabase(req, data);
      }
      return originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Admin action logging error:', error);
    next(); // Continue even if logging fails
  }
};

// Rate limiting for admin endpoints
export const adminRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.userId;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!userId) {
      return next();
    }
    
    // Clean old entries
    for (const [key, timestamp] of requests.entries()) {
      if (timestamp < windowStart) {
        requests.delete(key);
      }
    }
    
    // Check current user's requests
    const userRequests = Array.from(requests.entries())
      .filter(([key, timestamp]) => key.startsWith(userId) && timestamp > windowStart);
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests',
        error: 'Rate limit exceeded for admin endpoints'
      });
    }
    
    // Add current request
    requests.set(`${userId}-${now}`, now);
    next();
  };
};

// Helper function to check admin role
const checkAdminRole = async (userId) => {
  try {
    // Check user metadata for admin role
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return false;
    }
    
    const userMetadata = user.user_metadata || {};
    const isAdmin = userMetadata.role === 'admin' || 
                   userMetadata.role === 'super_admin' ||
                   userMetadata.is_admin === true ||
                   userMetadata.isAdmin === true;
    
    return isAdmin;
  } catch (error) {
    console.error('Check admin role error:', error);
    return false;
  }
};

// Helper function to check super admin role
const checkSuperAdminRole = async (userId) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return false;
    }
    
    const userMetadata = user.user_metadata || {};
    const isSuperAdmin = userMetadata.role === 'super_admin' ||
                        userMetadata.is_super_admin === true ||
                        userMetadata.isSuperAdmin === true;
    
    return isSuperAdmin;
  } catch (error) {
    console.error('Check super admin role error:', error);
    return false;
  }
};

// Helper function to log admin actions
const logActionToDatabase = async (req, data) => {
  try {
    const action = {
      admin_id: req.user.userId,
      action: req.method + ' ' + req.originalUrl,
      endpoint: req.originalUrl,
      method: req.method,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      request_body: req.method !== 'GET' ? req.body : null,
      response_status: res.statusCode,
      response_success: data ? JSON.parse(data).success : false,
      timestamp: new Date().toISOString()
    };

    // Log to database (you might want to create an admin_logs table)
    const { error } = await supabase
      .from('admin_logs')
      .insert([action]);

    if (error) {
      console.error('Failed to log admin action:', error);
    }
  } catch (error) {
    console.error('Admin action logging error:', error);
  }
};

// Admin session validation
export const validateAdminSession = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    // Check if user is still admin
    const isAdmin = await checkAdminRole(userId);
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin privileges revoked',
        error: 'User no longer has admin access'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin session validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export default {
  requireAdmin,
  requireSuperAdmin,
  logAdminAction,
  adminRateLimit,
  validateAdminSession
};

