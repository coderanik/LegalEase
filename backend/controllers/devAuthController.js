import jwt from 'jsonwebtoken';

// JWT secret key for development
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// In-memory storage for development (replace with database in production)
const users = new Map();

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Mock user registration for development
export const register = async (req, res) => {
  try {
    const { email, password, username, full_name, avatar_url } = req.body;

    // Check if user already exists
    if (users.has(email)) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
        error: 'An account with this email address already exists. Please try logging in instead.'
      });
    }

    // Create mock user
    const userId = `dev_user_${Date.now()}`;
    const user = {
      id: userId,
      email,
      username,
      full_name,
      avatar_url: avatar_url || null,
      created_at: new Date().toISOString(),
      email_confirmed: true // Mock as confirmed for development
    };

    // Store user (in production, this would be in a database)
    users.set(email, {
      ...user,
      password_hash: password // In production, hash this password
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          email_confirmed: user.email_confirmed,
          created_at: user.created_at
        },
        token,
        needsConfirmation: false
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Mock user login for development
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const userData = users.get(email);
    if (!userData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'Email or password is incorrect'
      });
    }

    // Check password (in production, use proper password hashing)
    if (userData.password_hash !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'Email or password is incorrect'
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: userData.id,
      email: userData.email,
      username: userData.username
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          username: userData.username,
          full_name: userData.full_name,
          avatar_url: userData.avatar_url,
          email_confirmed: userData.email_confirmed,
          created_at: userData.created_at
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Mock logout
export const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Mock get profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find user by ID
    let user = null;
    for (const [email, userData] of users.entries()) {
      if (userData.id === userId) {
        user = userData;
        break;
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          email_confirmed: user.email_confirmed,
          created_at: user.created_at
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Mock update profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, full_name, avatar_url } = req.body;

    // Find user by ID
    let userEmail = null;
    let user = null;
    for (const [email, userData] of users.entries()) {
      if (userData.id === userId) {
        userEmail = email;
        user = userData;
        break;
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user data
    const updatedUser = {
      ...user,
      username: username || user.username,
      full_name: full_name || user.full_name,
      avatar_url: avatar_url || user.avatar_url
    };

    users.set(userEmail, updatedUser);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          full_name: updatedUser.full_name,
          avatar_url: updatedUser.avatar_url,
          email_confirmed: updatedUser.email_confirmed,
          created_at: updatedUser.created_at
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Mock Google OAuth login
export const googleLogin = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Google OAuth not implemented in development mode'
  });
};

// Mock OAuth callback
export const handleOAuthCallback = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'OAuth callback not implemented in development mode'
  });
};

// Mock refresh token
export const refreshToken = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Token refresh not implemented in development mode'
  });
};
