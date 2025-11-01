import express, { Request, Response, NextFunction } from 'express';
import {
  getAllEmployees,
  createEmployee,
  getEmployeeById,
  updateEmployeePermissions,
  toggleEmployeeStatus,
  updateEmployeePassword,
  getAllDepartments,
  createDepartment,
  updateDepartment,
  getAllPermissions,
  getAllRoles
} from '../controllers/adminController';
import {
  authenticate,
  requireAdmin,
  requireEmployee,
  requirePermission
} from '../middleware/auth';
import {
  revalidateEmployee,
  revalidateAdmin,
  revalidateWithPermission
} from '../middleware/revalidate';
import {
  strictLimiter,
  passwordChangeLimiter
} from '../middleware/rateLimiter';
import { auditLog, getAuditLogs } from '../middleware/audit';
import {
  validateEmployeeCreation,
  validateEmployeePermissionUpdate,
  validateEmployeeStatusToggle,
  validatePasswordChange,
  validateDepartmentCreation
} from '../middleware/validation';

const router = express.Router();

// Employee management - with full security stack
router.get('/employees', authenticate, requireEmployee, revalidateEmployee, getAllEmployees);

router.post('/employees', 
  authenticate, 
  requireEmployee, 
  revalidateEmployee, 
  strictLimiter,
  validateEmployeeCreation,
  auditLog('EMPLOYEE_CREATE', (req) => `Created employee: ${req.body.email}`),
  createEmployee
);

router.get('/employees/:id', authenticate, requireEmployee, revalidateEmployee, getEmployeeById);

router.put('/employees/:id/permissions', 
  authenticate, 
  requireEmployee, 
  revalidateEmployee, 
  strictLimiter,
  validateEmployeePermissionUpdate,
  (req: Request, res: Response, next: NextFunction) => {
    // Fetch target employee name for audit log
    const { db } = require('../config/database');
    db.get('SELECT first_name, last_name FROM employees WHERE id = ?', [req.params.id], (err: any, row: any) => {
      if (!err && row) {
        (req as any).targetEmployeeName = `${row.first_name} ${row.last_name}`;
      }
      next();
    });
  },
  auditLog('EMPLOYEE_PERMISSION_UPDATE', (req) => {
    const employee = (req as any).employee;
    const targetName = (req as any).targetEmployeeName || `ID ${req.params.id}`;
    return `Employee ${employee.email} updated permissions for employee ${targetName} (ID ${req.params.id})`;
  }),
  updateEmployeePermissions
);

router.patch('/employees/:id/status', 
  authenticate, 
  requireEmployee, 
  revalidateEmployee, 
  strictLimiter,
  validateEmployeeStatusToggle,
  (req: Request, res: Response, next: NextFunction) => {
    // Fetch target employee name for audit log
    const { db } = require('../config/database');
    db.get('SELECT first_name, last_name FROM employees WHERE id = ?', [req.params.id], (err: any, row: any) => {
      if (!err && row) {
        (req as any).targetEmployeeName = `${row.first_name} ${row.last_name}`;
      }
      next();
    });
  },
  auditLog('EMPLOYEE_STATUS_CHANGE', (req) => {
    const status = req.body.is_active ? 'activated' : 'deactivated';
    const targetName = (req as any).targetEmployeeName || `ID ${req.params.id}`;
    return `Employee ${targetName} (ID ${req.params.id}) ${status}`;
  }),
  toggleEmployeeStatus
);

router.put('/employees/:id/password', 
  authenticate, 
  requireEmployee, 
  revalidateEmployee, 
  passwordChangeLimiter,
  validatePasswordChange,
  (req: Request, res: Response, next: NextFunction) => {
    // Fetch target employee name for audit log
    const { db } = require('../config/database');
    db.get('SELECT first_name, last_name FROM employees WHERE id = ?', [req.params.id], (err: any, row: any) => {
      if (!err && row) {
        (req as any).targetEmployeeName = `${row.first_name} ${row.last_name}`;
      }
      next();
    });
  },
  auditLog('EMPLOYEE_PASSWORD_CHANGE', (req) => {
    const targetName = (req as any).targetEmployeeName || `ID ${req.params.id}`;
    return `Password changed for employee ${targetName} (ID ${req.params.id})`;
  }),
  updateEmployeePassword
);

// Department management
router.get('/departments', getAllDepartments);

router.post('/departments', 
  authenticate, 
  requireAdmin, 
  revalidateAdmin, 
  strictLimiter,
  validateDepartmentCreation,
  auditLog('DEPARTMENT_CREATE', (req) => `Created department: ${req.body.name}`),
  createDepartment
);

router.put('/departments/:id', 
  authenticate, 
  requireAdmin, 
  revalidateAdmin, 
  strictLimiter,
  validateDepartmentCreation,
  auditLog('DEPARTMENT_UPDATE', (req) => `Updated department ID ${req.params.id}`),
  updateDepartment
);

// Permissions and roles
router.get('/permissions', authenticate, requireEmployee, revalidateEmployee, getAllPermissions);
router.get('/roles', authenticate, requireEmployee, revalidateEmployee, getAllRoles);

// Audit logs - requires view_audit_logs permission or admin/admin_access
router.get('/audit-logs', authenticate, requireEmployee, revalidateEmployee, getAuditLogs);

export default router;
