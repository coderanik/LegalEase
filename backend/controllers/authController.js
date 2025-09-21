import { supabase } from '../config/db.js';
import jwt from 'jsonwebtoken';
import { userRegistrationSchema, loginSchema } from '../utils/userValidation.js';

// JWT secret key (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Register a new user
export const register = async (req, res) => {
  try {
    // Validate request data
    const { error, value } = userRegistrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { email, password, username, full_name, avatar_url } = value;

    // Sign up user with Supabase Auth
<<<<<<< HEAD
=======
    console.log('Attempting to register user:', { email, username, full_name });
    
>>>>>>> anik
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name,
          avatar_url: avatar_url || null
<<<<<<< HEAD
        }
=======
        },
        emailRedirectTo: undefined // Disable email confirmation for development
>>>>>>> anik
      }
    });

    if (authError) {
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Registration failed',
        error: authError.message
=======
      console.error('Supabase registration error:', authError);
      
      // Handle specific error cases
      if (authError.message.includes('Email address') && authError.message.includes('invalid')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format. Please use a valid email address.',
          error: 'Please ensure your email address is properly formatted (e.g., user@example.com)'
        });
      }
      
      if (authError.message.includes('User already registered')) {
        return res.status(400).json({
          success: false,
          message: 'User already exists',
          error: 'An account with this email address already exists. Please try logging in instead.'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Registration failed',
        error: authError.message || 'An error occurred during registration'
>>>>>>> anik
      });
    }

    // Check if user needs email confirmation
    if (authData.user && !authData.user.email_confirmed_at) {
      return res.status(201).json({
        success: true,
        message: 'Registration successful! Please check your email to confirm your account.',
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            username,
            full_name,
            avatar_url: avatar_url || null
          },
          needsConfirmation: true
        }
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: authData.user.id,
      email: authData.user.email,
      username
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          username,
          full_name,
          avatar_url: avatar_url || null
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

// Login user
export const login = async (req, res) => {
  try {
    // Validate request data
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { email, password } = value;

    // Sign in user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: authError.message
      });
    }

    // Get user metadata
    const userMetadata = authData.user.user_metadata || {};
    const username = userMetadata.username || userMetadata.full_name || 'User';

    // Generate JWT token
    const token = generateToken({
      userId: authData.user.id,
      email: authData.user.email,
      username
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          username,
          full_name: userMetadata.full_name || null,
          avatar_url: userMetadata.avatar_url || null
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

// Logout user
export const logout = async (req, res) => {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }

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

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userMetadata = user.user_metadata || {};

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: userMetadata.username || userMetadata.full_name || 'User',
          full_name: userMetadata.full_name || null,
          avatar_url: userMetadata.avatar_url || null,
          email_confirmed: !!user.email_confirmed_at,
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

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, full_name, avatar_url } = req.body;

    // Update user metadata in Supabase
    const { data, error } = await supabase.auth.updateUser({
      data: {
        username,
        full_name,
        avatar_url
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Profile update failed',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          username,
          full_name,
          avatar_url
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

// Google OAuth login
export const googleLogin = async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback`
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Google login failed',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Redirect to Google OAuth',
      data: {
        url: data.url
      }
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Handle OAuth callback
export const handleOAuthCallback = async (req, res) => {
  try {
    const { access_token, refresh_token } = req.query;

    if (!access_token) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Set session with tokens
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'OAuth callback failed',
        error: error.message
      });
    }

    const userMetadata = data.user.user_metadata || {};
    const username = userMetadata.username || userMetadata.full_name || 'User';

    // Generate JWT token
    const token = generateToken({
      userId: data.user.id,
      email: data.user.email,
      username
    });

    // Redirect to frontend with token
    const frontendUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success?token=${token}`;
    res.redirect(frontendUrl);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: 'Token refresh failed',
        error: error.message
      });
    }

    const userMetadata = data.user.user_metadata || {};
    const username = userMetadata.username || userMetadata.full_name || 'User';

    // Generate new JWT token
    const token = generateToken({
      userId: data.user.id,
      email: data.user.email,
      username
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token,
        user: {
          id: data.user.id,
          email: data.user.email,
          username,
          full_name: userMetadata.full_name || null,
          avatar_url: userMetadata.avatar_url || null
        }
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
