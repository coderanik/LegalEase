# Backend API Routes Documentation

This document provides a comprehensive overview of all available API routes in the backend application.

## Base URL
```
http://localhost:5100
```

## Authentication
- **Public Routes**: No authentication required
- **Protected Routes**: Require valid JWT token in Authorization header
- **Admin Routes**: Require admin privileges and additional middleware

---

## 1. Health Check Routes
**Base Path**: `/api/health`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Basic health check | No |
| GET | `/comprehensive` | Comprehensive health check | No |
| GET | `/metrics` | Service metrics | Yes |
| GET | `/status` | API status | No |

---

## 2. Authentication Routes
**Base Path**: `/api/auth`

### Public Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | User registration | No |
| POST | `/login` | User login | No |
| POST | `/logout` | User logout | No |
| GET | `/google` | Google OAuth login | No |
| GET | `/callback` | OAuth callback handler | No |
| POST | `/refresh` | Refresh JWT token | No |

### Protected Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/profile` | Get user profile | Yes |
| PUT | `/profile` | Update user profile | Yes |

---

## 3. Document Upload Routes
**Base Path**: `/api/upload`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/single` | Upload single document | Yes |
| POST | `/multiple` | Upload multiple documents (max 10) | Yes |
| GET | `/documents` | Get user's documents | Yes |
| GET | `/documents/:id` | Get specific document | Yes |
| PUT | `/documents/:id` | Update document | Yes |
| DELETE | `/documents/:id` | Delete document | Yes |
| GET | `/documents/:id/download` | Download document | Yes |

---

## 4. Document Management Routes
**Base Path**: `/api/documents`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/metadata/:id` | Get document metadata | Yes |
| GET | `/status/:id` | Get document status | Yes |
| GET | `/all` | Get all documents metadata | Yes |
| GET | `/category/:category` | Get documents by category | Yes |
| GET | `/statistics` | Get document statistics | Yes |
| GET | `/search` | Search documents | Yes |
| GET | `/analytics` | Get document analytics | Yes |
| GET | `/trends` | Get document trends data | Yes |
| GET | `/performance` | Get document performance data | Yes |

---

## 5. Document Listing Routes
**Base Path**: `/api/documents/all`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all documents | Yes |
| GET | `/status/:status` | Get documents by status | Yes |
| GET | `/recent` | Get recent documents | Yes |
| GET | `/categories` | Get document categories | Yes |

---

## 6. Document Deletion Routes
**Base Path**: `/api/delete`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| DELETE | `/:documentId` | Delete single document | Yes |
| POST | `/multiple` | Delete multiple documents | Yes |
| DELETE | `/category/:category` | Delete documents by category | Yes |
| GET | `/preview` | Get deletion preview | Yes |

---

## 7. Clause Management Routes
**Base Path**: `/api/clauses`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/extract/:documentId` | Extract clauses from document | Yes |
| GET | `/document/:documentId` | Get document clauses | Yes |
| POST | `/analyze/:clauseId` | Analyze specific clause | Yes |
| GET | `/search` | Search clauses | Yes |
| GET | `/statistics` | Get clause statistics | Yes |

---

## 8. Query Routes
**Base Path**: `/api/query`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/document/:documentId` | Query document | Yes |
| GET | `/document/:documentId/history` | Get document query history | Yes |
| GET | `/all` | Get all user queries | Yes |

---

## 9. Feedback Routes
**Base Path**: `/api/feedback`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/query/:queryId` | Submit query feedback | Yes |
| POST | `/clause/:clauseId` | Submit clause feedback | Yes |
| POST | `/document/:documentId` | Submit document feedback | Yes |
| GET | `/analytics` | Get feedback analytics | Yes |
| GET | `/suggestions` | Get feedback suggestions | Yes |

---

## 10. Admin Routes
**Base Path**: `/api/admin`
**Note**: All admin routes require admin privileges and additional middleware (rate limiting, action logging, session validation)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/dashboard` | Get system overview | Admin |
| GET | `/analytics` | Get system analytics | Admin |
| GET | `/file-stats` | Get file handling statistics | Admin |
| GET | `/users` | Get all users | Admin |
| GET | `/users/:userId` | Get user details | Admin |
| POST | `/actions` | Perform admin action | Admin |
| POST | `/actions/critical` | Perform critical admin action | Super Admin |

---

## 11. Admin Analytics Routes
**Base Path**: `/api/admin/analytics`
**Note**: All routes require admin privileges with rate limiting (50 requests per 15 minutes)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/realtime` | Get real-time metrics | Admin |
| GET | `/user-activity` | Get user activity patterns | Admin |
| GET | `/ai-performance` | Get AI performance analytics | Admin |
| GET | `/security` | Get security compliance report | Admin |
| GET | `/recommendations` | Get system recommendations | Admin |

---

## Additional Endpoints

### Root Endpoint
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Basic server status check | No |

### Gemini API Test
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/test-gemini` | Test Gemini API connection | No |

---

## Middleware Applied

### Authentication Middleware
- `authenticateToken`: Validates JWT tokens for protected routes

### Admin Middleware
- `requireAdmin`: Ensures user has admin privileges
- `requireSuperAdmin`: Ensures user has super admin privileges
- `logAdminAction`: Logs admin actions for audit trail
- `adminRateLimit`: Rate limiting for admin routes
- `validateAdminSession`: Validates admin session

### Rate Limiting
- **Admin Routes**: 100 requests per 15 minutes
- **Admin Analytics**: 50 requests per 15 minutes

---

## Error Handling
All routes include proper error handling and return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

---

## Notes
- All protected routes require a valid JWT token in the `Authorization` header
- File uploads support various document formats
- Admin routes have additional security measures including rate limiting and action logging
- The API uses Express.js with CORS enabled for cross-origin requests
