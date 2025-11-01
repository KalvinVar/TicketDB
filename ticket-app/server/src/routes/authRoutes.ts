import express from 'express';
import {
  registerUser,
  loginUser,
  registerEmployee,
  loginEmployee,
  verifyToken,
  refreshEmployeeToken
} from '../controllers/authController';
import { authenticate, requireEmployee } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimiter';
import { 
  validateUserRegistration, 
  validateLogin 
} from '../middleware/validation';

const router = express.Router();

// User (customer) authentication - with rate limiting and validation
router.post('/auth/user/register', loginLimiter, validateUserRegistration, registerUser);
router.post('/auth/user/login', loginLimiter, validateLogin, loginUser);

// Employee authentication - with rate limiting and validation
router.post('/auth/employee/register', loginLimiter, validateUserRegistration, registerEmployee);
router.post('/auth/employee/login', loginLimiter, validateLogin, loginEmployee);

// Token verification
router.get('/auth/verify', verifyToken);

// Refresh employee token with fresh permissions
router.post('/auth/employee/refresh', authenticate, requireEmployee, refreshEmployeeToken);

export default router;
