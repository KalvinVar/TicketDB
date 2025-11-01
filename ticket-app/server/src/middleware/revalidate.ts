import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

/**
 * Re-validates employee permissions from database
 * Use this on sensitive operations to ensure permissions haven't been revoked
 * since the JWT was issued
 */
export const revalidateEmployee = (req: Request, res: Response, next: NextFunction) => {
  const employee = (req as any).employee;
  
  if (!employee || !employee.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  // Fetch current employee data from database
  const query = `
    SELECT 
      e.id,
      e.email,
      e.first_name,
      e.last_name,
      e.department_id,
      e.role,
      e.permissions,
      e.is_active
    FROM employees e
    WHERE e.id = ?
  `;
  
  db.get(query, [employee.id], (err, row: any) => {
    if (err) {
      console.error('Database revalidation error:', err);
      res.status(500).json({ error: 'Database error during permission validation' });
      return;
    }
    
    if (!row) {
      res.status(404).json({ error: 'Employee account not found' });
      return;
    }
    
    // Check if account is still active
    if (!row.is_active) {
      res.status(403).json({ error: 'Your account has been deactivated. Please contact an administrator.' });
      return;
    }
    
    // Parse permissions from JSON
    const currentPermissions = row.permissions ? JSON.parse(row.permissions) : [];
    
    // Get permission names from IDs
    if (currentPermissions.length > 0) {
      const permQuery = `SELECT id, name FROM permissions WHERE id IN (${currentPermissions.map(() => '?').join(',')})`;
      db.all(permQuery, currentPermissions, (err, permRows: any[]) => {
        if (err) {
          console.error('Permission lookup error:', err);
          res.status(500).json({ error: 'Error validating permissions' });
          return;
        }
        
        // Update the employee object with fresh database data
        (req as any).employee = {
          id: row.id,
          email: row.email,
          first_name: row.first_name,
          last_name: row.last_name,
          department_id: row.department_id,
          role: row.role,
          permissions: permRows.map(p => p.name),
          is_active: row.is_active
        };
        
        next();
      });
    } else {
      // No permissions, just update with fresh data
      (req as any).employee = {
        id: row.id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        department_id: row.department_id,
        role: row.role,
        permissions: [],
        is_active: row.is_active
      };
      
      next();
    }
  });
};

/**
 * Revalidate and require specific permission
 * Combines revalidation with permission check
 */
export const revalidateWithPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    revalidateEmployee(req, res, () => {
      const employee = (req as any).employee;
      const permissions = employee.permissions || [];
      
      // Admins have all permissions
      if (employee.role === 'admin' || permissions.includes('admin_access')) {
        next();
        return;
      }
      
      // Check if employee has the required permission
      if (!permissions.includes(permission)) {
        res.status(403).json({ error: `Permission denied: ${permission} required` });
        return;
      }
      
      next();
    });
  };
};

/**
 * Revalidate for admin-only operations
 */
export const revalidateAdmin = (req: Request, res: Response, next: NextFunction) => {
  revalidateEmployee(req, res, () => {
    const employee = (req as any).employee;
    
    if (employee.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    
    next();
  });
};
