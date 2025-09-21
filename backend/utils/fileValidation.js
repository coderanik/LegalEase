import Joi from 'joi';

// File upload validation schema
export const fileUploadSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title must not exceed 200 characters'
    }),
  description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 1000 characters'
    }),
  category: Joi.string()
    .valid('general', 'work', 'personal', 'education', 'legal', 'medical', 'financial', 'other')
    .default('general')
    .messages({
      'any.only': 'Category must be one of: general, work, personal, education, legal, medical, financial, other'
    })
});

// Multiple file upload validation schema
export const multipleFileUploadSchema = Joi.object({
  category: Joi.string()
    .valid('general', 'work', 'personal', 'education', 'legal', 'medical', 'financial', 'other')
    .default('general')
    .messages({
      'any.only': 'Category must be one of: general, work, personal, education, legal, medical, financial, other'
    })
});

// Document update validation schema
export const documentUpdateSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title must not exceed 200 characters',
      'any.required': 'Title is required'
    }),
  description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 1000 characters'
    }),
  category: Joi.string()
    .valid('general', 'work', 'personal', 'education', 'legal', 'medical', 'financial', 'other')
    .required()
    .messages({
      'any.only': 'Category must be one of: general, work, personal, education, legal, medical, financial, other',
      'any.required': 'Category is required'
    })
});

// Document query validation schema
export const documentQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100'
    }),
  category: Joi.string()
    .valid('general', 'work', 'personal', 'education', 'legal', 'medical', 'financial', 'other')
    .optional()
    .messages({
      'any.only': 'Category must be one of: general, work, personal, education, legal, medical, financial, other'
    }),
  search: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search term must be at least 1 character long',
      'string.max': 'Search term must not exceed 100 characters'
    })
});

// File type validation
export const validateFileType = (mimetype) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  return allowedTypes.includes(mimetype);
};

// File size validation (in bytes)
export const validateFileSize = (size, maxSize = 10 * 1024 * 1024) => {
  return size <= maxSize;
};

// Get file extension from mimetype
export const getFileExtension = (mimetype) => {
  const mimeToExt = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx'
  };

  return mimeToExt[mimetype] || '';
};

// Format file size for display
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Sanitize filename
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
};

export default {
  fileUploadSchema,
  multipleFileUploadSchema,
  documentUpdateSchema,
  documentQuerySchema,
  validateFileType,
  validateFileSize,
  getFileExtension,
  formatFileSize,
  sanitizeFilename
};
