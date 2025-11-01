import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

export interface AuditLogEntry {
  employee_id?: number;
  action_type: string;
  action_description: string;
  target_type?: string;
  target_id?: number;
  ip_address?: string;
  user_agent?: string;
  request_data?: string;
}

/**
 * Logs an audit entry to the database
 */
export const logAudit = (entry: AuditLogEntry): Promise<void> => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO audit_logs (
        employee_id,
        action_type,
        action_description,
        target_type,
        target_id,
        ip_address,
        user_agent,
        request_data,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    db.run(
      query,
      [
        entry.employee_id || null,
        entry.action_type,
        entry.action_description,
        entry.target_type || null,
        entry.target_id || null,
        entry.ip_address || null,
        entry.user_agent || null,
        entry.request_data || null,
      ],
      (err) => {
        if (err) {
          console.error('Audit log error:', err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};

/**
 * Middleware to automatically log sensitive actions
 */
export const auditLog = (actionType: string, getDescription: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const employee = (req as any).employee;
    const originalJson = res.json.bind(res);

    // Override res.json to log after successful response
    res.json = function (data: any) {
      // Only log if the response was successful (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Build detailed request data
        const requestData: any = {
          method: req.method,
          path: req.path,
          params: req.params,
        };

        // Add body information (excluding sensitive fields)
        if (req.body && Object.keys(req.body).length > 0) {
          const sanitizedBody = { ...req.body };
          // Remove password fields
          if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
          if (sanitizedBody.newPassword) sanitizedBody.newPassword = '[REDACTED]';
          requestData.changes = sanitizedBody;
        }

        const entry: AuditLogEntry = {
          employee_id: employee?.id,
          action_type: actionType,
          action_description: getDescription(req),
          target_type: req.params.id ? 'employee' : undefined,
          target_id: req.params.id ? parseInt(req.params.id) : undefined,
          ip_address: req.ip || req.socket.remoteAddress,
          user_agent: req.headers['user-agent'],
          request_data: JSON.stringify(requestData),
        };

        logAudit(entry).catch((err) => {
          console.error('Failed to create audit log:', err);
        });
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Get audit logs with filtering and role-based access control
 */
export const getAuditLogs = (req: Request, res: Response) => {
  const { employee_id, employee_name, action_type, limit = 100, offset = 0 } = req.query;
  const currentEmployee = (req as any).employee;
  const currentRole = currentEmployee.role;
  const currentDeptId = currentEmployee.department_id;
  const currentEmployeeId = currentEmployee.id;
  const currentPermissions = currentEmployee.permissions || [];

  // Check if user has permission to view audit logs
  const hasViewAuditLogs = currentPermissions.includes('view_audit_logs');
  const hasAdminAccess = currentRole === 'admin' || currentPermissions.includes('admin_access');

  if (!hasViewAuditLogs && !hasAdminAccess) {
    res.status(403).json({ error: 'You do not have permission to view audit logs' });
    return;
  }

  let query = `
    SELECT 
      al.*,
      e.first_name || ' ' || e.last_name as employee_name,
      e.email as employee_email,
      e.department_id as employee_department_id,
      e.role as employee_role,
      te.first_name || ' ' || te.last_name as target_employee_name,
      te.email as target_employee_email
    FROM audit_logs al
    LEFT JOIN employees e ON al.employee_id = e.id
    LEFT JOIN employees te ON al.target_id = te.id AND al.target_type = 'employee'
    WHERE 1=1
  `;

  const params: any[] = [];

  // Apply role-based filtering
  if (!hasAdminAccess) {
    if (currentRole === 'manager') {
      // Managers see their own logs + their department's logs
      query += ` AND (al.employee_id = ? OR e.department_id = ?)`;
      params.push(currentEmployeeId, currentDeptId);
    } else if (currentRole === 'agent') {
      // Agents see their own logs + other agents' logs
      query += ` AND (al.employee_id = ? OR e.role = 'agent')`;
      params.push(currentEmployeeId);
    } else {
      // Other roles (viewer, etc.) can only see their own logs
      query += ` AND al.employee_id = ?`;
      params.push(currentEmployeeId);
    }
  }
  // Admins and admin_access users see ALL logs (no additional filter)

  // Apply user-provided filters
  if (employee_id) {
    query += ' AND al.employee_id = ?';
    params.push(employee_id);
  }

  if (employee_name) {
    query += ' AND (e.first_name || \' \' || e.last_name) LIKE ?';
    params.push(`%${employee_name}%`);
  }

  if (action_type) {
    query += ' AND al.action_type = ?';
    params.push(action_type);
  }

  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit as string), parseInt(offset as string));

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.json({ logs: rows });
  });
};
