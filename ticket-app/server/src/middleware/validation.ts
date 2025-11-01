import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
    return;
  }
  next();
};

/**
 * User registration validation
 */
export const validateUserRegistration = [
  body('email')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters')
    .matches(/^[a-zA-Z\s-]+$/).withMessage('First name can only contain letters, spaces, and hyphens'),
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters')
    .matches(/^[a-zA-Z\s-]+$/).withMessage('Last name can only contain letters, spaces, and hyphens'),
  body('phone')
    .optional()
    .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone number format'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Company name too long'),
  handleValidationErrors,
];

/**
 * Login validation
 */
export const validateLogin = [
  body('email')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 1 }).withMessage('Password is required'),
  handleValidationErrors,
];

/**
 * Employee creation validation
 */
export const validateEmployeeCreation = [
  body('email')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters')
    .matches(/^[a-zA-Z\s-]+$/).withMessage('First name can only contain letters, spaces, and hyphens'),
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters')
    .matches(/^[a-zA-Z\s-]+$/).withMessage('Last name can only contain letters, spaces, and hyphens'),
  body('department_id')
    .isInt({ min: 1 }).withMessage('Valid department ID required'),
  body('role')
    .isIn(['admin', 'manager', 'agent', 'viewer']).withMessage('Invalid role'),
  body('permissions')
    .isArray().withMessage('Permissions must be an array')
    .custom((value) => {
      // Ensure all permission IDs are positive integers
      return value.every((id: any) => Number.isInteger(id) && id > 0);
    }).withMessage('Invalid permission IDs'),
  handleValidationErrors,
];

/**
 * Employee permission update validation
 */
export const validateEmployeePermissionUpdate = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid employee ID required'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'agent', 'viewer']).withMessage('Invalid role'),
  body('permissions')
    .optional()
    .isArray().withMessage('Permissions must be an array')
    .custom((value) => {
      return value.every((id: any) => Number.isInteger(id) && id > 0);
    }).withMessage('Invalid permission IDs'),
  body('department_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Valid department ID required'),
  handleValidationErrors,
];

/**
 * Employee status toggle validation
 */
export const validateEmployeeStatusToggle = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid employee ID required'),
  body('is_active')
    .isBoolean().withMessage('is_active must be a boolean'),
  handleValidationErrors,
];

/**
 * Password change validation
 */
export const validatePasswordChange = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid employee ID required'),
  body('current_password')
    .isLength({ min: 1 }).withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  handleValidationErrors,
];

/**
 * Ticket creation validation
 */
export const validateTicketCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 500 }).withMessage('Title must be 5-500 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters'),
  body('type')
    .optional()
    .isIn(['request', 'problem', 'incident', 'question']).withMessage('Invalid ticket type'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('department_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Valid department ID required'),
  handleValidationErrors,
];

/**
 * Ticket update validation
 */
export const validateTicketUpdate = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid ticket ID required'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 }).withMessage('Title must be 5-500 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters'),
  body('type')
    .optional()
    .isIn(['request', 'problem', 'incident', 'question']).withMessage('Invalid ticket type'),
  body('status')
    .optional()
    .isIn(['open', 'in_progress', 'pending', 'closed']).withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('assigned_to')
    .optional()
    .custom((value) => value === null || (Number.isInteger(value) && value > 0))
    .withMessage('Invalid assigned_to value'),
  body('department_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Valid department ID required'),
  handleValidationErrors,
];

/**
 * Note creation validation
 */
export const validateNoteCreation = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid ticket ID required'),
  body('note_text')
    .trim()
    .isLength({ min: 1, max: 5000 }).withMessage('Note must be 1-5000 characters'),
  body('is_internal')
    .isBoolean().withMessage('is_internal must be a boolean'),
  handleValidationErrors,
];

/**
 * Department creation validation
 */
export const validateDepartmentCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Department name must be 2-100 characters')
    .matches(/^[a-zA-Z\s&-]+$/).withMessage('Department name can only contain letters, spaces, &, and hyphens'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description too long'),
  handleValidationErrors,
];
