import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Extend Express Request type to include user data
declare global {
  namespace Express {
    interface Request {
      user?: any;
      employee?: any;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user/employee data to request
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Attach user/employee data to request
    if (decoded.type === 'user') {
      req.user = decoded;
    } else if (decoded.type === 'employee') {
      req.employee = decoded;
    }
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Employee-only middleware
 * Ensures only employees can access the route
 */
export const requireEmployee = (req: Request, res: Response, next: NextFunction) => {
  if (!req.employee) {
    res.status(403).json({ error: 'Employee access required' });
    return;
  }
  next();
};

/**
 * Admin-only middleware
 * Ensures only admin employees can access the route
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.employee || req.employee.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

/**
 * Permission check middleware factory
 * Creates middleware that checks for specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.employee) {
      res.status(403).json({ error: 'Employee access required' });
      return;
    }
    
    const permissions = req.employee.permissions || [];
    
    // Admins have all permissions
    if (req.employee.role === 'admin' || permissions.includes('admin_access')) {
      next();
      return;
    }
    
    // Check if employee has the required permission
    if (!permissions.includes(permission)) {
      res.status(403).json({ error: `Permission denied: ${permission} required` });
      return;
    }
    
    next();
  };
};

/**
 * Department access middleware
 * Ensures employees can only access tickets from their department
 * (unless they have view_all_tickets permission)
 */
export const requireDepartmentAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.employee) {
    res.status(403).json({ error: 'Employee access required' });
    return;
  }
  
  const permissions = req.employee.permissions || [];
  
  // Admins and employees with view_all_tickets can access all departments
  if (req.employee.role === 'admin' || permissions.includes('view_all_tickets')) {
    next();
    return;
  }
  
  // For department-specific access, we'll check in the controller
  // This middleware just ensures they're an employee
  next();
};
