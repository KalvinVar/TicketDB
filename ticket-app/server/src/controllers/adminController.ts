import { Request, Response } from 'express';
import { db } from '../config/database';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

/**
 * Get all employees
 * Access: Admin (all employees), Agent with manage_employees (all employees), Manager with manage_employees (own department only)
 */
export const getAllEmployees = (req: Request, res: Response) => {
  const employee = (req as any).employee;
  const currentRole = employee.role;
  const currentDeptId = employee.department_id;
  const permissions = employee.permissions || [];
  
  // Check if user has manage_employees permission or is admin
  if (currentRole !== 'admin' && !permissions.includes('manage_employees')) {
    res.status(403).json({ error: 'You do not have permission to view employees' });
    return;
  }
  
  let query = `SELECT 
    e.id,
    e.email,
    e.first_name,
    e.last_name,
    e.department_id,
    d.name as department_name,
    e.role,
    e.permissions,
    e.is_active,
    e.created_at
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id`;
  
  const params: any[] = [];
  
  // Managers can only see employees in their department
  if (currentRole === 'manager') {
    query += ' WHERE e.department_id = ?';
    params.push(currentDeptId);
  }
  
  query += ' ORDER BY e.created_at DESC';
  
  db.all(query, params, (err, rows: any[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Parse permissions JSON for each employee
    const employees = rows.map(emp => ({
      ...emp,
      permissions: JSON.parse(emp.permissions || '[]')
    }));
    
    res.json(employees);
  });
};

/**
 * Create new employee
 * Access: Admin (full control), Agent with manage_employees (restricted), Manager with manage_employees (department only)
 */
export const createEmployee = async (req: Request, res: Response) => {
  const { 
    email, 
    password, 
    first_name, 
    last_name, 
    department_id,
    role = 'agent',
    permissions = []
  } = req.body;
  
  const currentEmployee = (req as any).employee;
  const currentRole = currentEmployee.role;
  const currentDeptId = currentEmployee.department_id;
  const currentPermissions = currentEmployee.permissions || [];
  
  // Check if user has manage_employees permission or is admin
  if (currentRole !== 'admin' && !currentPermissions.includes('manage_employees')) {
    res.status(403).json({ error: 'You do not have permission to create employees' });
    return;
  }
  
  // Input validation
  if (!email || !password || !first_name || !last_name || !department_id) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }
  
  // Password strength validation
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long' });
    return;
  }
  
  // Define role hierarchy: admin > manager > agent > viewer
  const roleHierarchy: { [key: string]: number } = {
    'admin': 4,
    'manager': 3,
    'agent': 2,
    'viewer': 1
  };
  
  const currentRoleLevel = roleHierarchy[currentRole] || 0;
  const newRoleLevel = roleHierarchy[role] || 0;
  
  // Can only create roles below your own level (admins can create admins)
  if (currentRole !== 'admin' && newRoleLevel >= currentRoleLevel) {
    res.status(403).json({ error: 'You can only create employees with roles below your own level' });
    return;
  }
  
  // ROLE RESTRICTIONS
  // Manager can only create employees in their department
  if (currentRole === 'manager') {
    if (department_id !== currentDeptId) {
      res.status(403).json({ error: 'Managers can only create employees in their own department' });
      return;
    }
    
    // Check for restricted permissions
    if (permissions.length > 0) {
      const permQuery = `SELECT name FROM permissions WHERE id IN (${permissions.map(() => '?').join(',')})`;
      db.all(permQuery, permissions, async (err, permRows: any[]) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        const permNames = permRows.map(p => p.name);
        const restrictedPerms = ['manage_employees', 'admin_access', 'view_audit_logs'];
        const hasRestricted = permNames.some(p => restrictedPerms.includes(p));
        
        if (hasRestricted) {
          res.status(403).json({ error: 'Managers cannot grant manage_employees, admin_access, or view_audit_logs permissions' });
          return;
        }
        
        await performEmployeeCreation();
      });
      return;
    }
  }
  
  // Agent restrictions
  if (currentRole === 'agent') {
    // Check for restricted permissions
    if (permissions.length > 0) {
      const permQuery = `SELECT name FROM permissions WHERE id IN (${permissions.map(() => '?').join(',')})`;
      db.all(permQuery, permissions, async (err, permRows: any[]) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        const permNames = permRows.map(p => p.name);
        const restrictedPerms = ['manage_employees', 'admin_access', 'view_audit_logs'];
        const hasRestricted = permNames.some(p => restrictedPerms.includes(p));
        
        if (hasRestricted) {
          res.status(403).json({ error: 'Agents cannot grant manage_employees, admin_access, or view_audit_logs permissions' });
          return;
        }
        
        await performEmployeeCreation();
      });
      return;
    }
  }
  
  // Admin has no restrictions
  await performEmployeeCreation();
  
  async function performEmployeeCreation() {
    // Validate role
    const validRoles = ['admin', 'manager', 'agent', 'viewer'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    
    try {
      // Check if employee already exists
      db.get('SELECT id FROM employees WHERE email = ?', [email], async (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        if (row) {
          res.status(409).json({ error: 'Email already registered' });
          return;
        }
        
        // Verify department exists
        db.get('SELECT id FROM departments WHERE id = ?', [department_id], async (err, dept) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          if (!dept) {
            res.status(400).json({ error: 'Invalid department ID' });
            return;
          }
          
          // Hash password
          const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
          
          // Convert permissions array to JSON string
          const permissions_json = JSON.stringify(permissions);
          
          // Insert new employee
          const query = `INSERT INTO employees (
            email, 
            password_hash, 
            first_name, 
            last_name, 
            department_id,
            role,
            permissions,
            is_active,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`;
          
          db.run(query, [email, password_hash, first_name, last_name, department_id, role, permissions_json], function(err) {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            
            res.status(201).json({
              message: 'Employee created successfully',
              employee: {
                id: this.lastID,
                email,
                first_name,
                last_name,
                department_id,
                role,
                permissions
              }
            });
          });
        });
      });
    } catch (error) {
      res.status(500).json({ error: 'Employee creation failed' });
    }
  }
};

/**
 * Get employee by ID
 */
export const getEmployeeById = (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Invalid employee ID' });
    return;
  }
  
  const query = `SELECT 
    e.id,
    e.email,
    e.first_name,
    e.last_name,
    e.department_id,
    d.name as department_name,
    e.role,
    e.permissions,
    e.is_active,
    e.created_at
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  WHERE e.id = ?`;
  
  db.get(query, [id], (err, row: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
    
    const employee = {
      ...row,
      permissions: JSON.parse(row.permissions || '[]')
    };
    
    res.json(employee);
  });
};

/**
 * Update employee permissions and role
 * Access: Admin (full control), Agent with manage_employees (restricted), Manager with manage_employees (department only, restricted)
 */
export const updateEmployeePermissions = (req: Request, res: Response) => {
  const { id } = req.params;
  const { role, permissions, department_id } = req.body;
  const currentEmployee = (req as any).employee;
  const currentRole = currentEmployee.role;
  const currentDeptId = currentEmployee.department_id;
  const currentPermissions = currentEmployee.permissions || [];
  const currentEmployeeId = currentEmployee.id;
  
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Invalid employee ID' });
    return;
  }
  
  // Prevent editing own permissions
  if (parseInt(id) === currentEmployeeId) {
    res.status(403).json({ error: 'You cannot edit your own permissions. Ask a higher-level administrator to make changes to your account.' });
    return;
  }
  
  // Check if user has manage_employees permission or is admin
  if (currentRole !== 'admin' && !currentPermissions.includes('manage_employees')) {
    res.status(403).json({ error: 'You do not have permission to manage employees' });
    return;
  }
  
  // First, get the target employee to check department and current role
  db.get('SELECT id, department_id, role, permissions FROM employees WHERE id = ?', [id], (err, targetEmployee: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!targetEmployee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
    
    // Parse target employee's current permissions
    const targetCurrentPermissions = targetEmployee.permissions ? JSON.parse(targetEmployee.permissions) : [];
    
    // Define role hierarchy: admin > manager > agent > viewer
    const roleHierarchy: { [key: string]: number } = {
      'admin': 4,
      'manager': 3,
      'agent': 2,
      'viewer': 1
    };
    
    const currentRoleLevel = roleHierarchy[currentRole] || 0;
    const targetRoleLevel = roleHierarchy[targetEmployee.role] || 0;
    
    // Cannot edit someone at same or higher level (except admins can edit admins)
    if (currentRole !== 'admin' && targetRoleLevel >= currentRoleLevel) {
      res.status(403).json({ error: 'You can only edit employees at lower hierarchy levels than yourself' });
      return;
    }
    
    // If changing role, validate new role is below current user's level
    if (role !== undefined) {
      const newRoleLevel = roleHierarchy[role] || 0;
      if (currentRole !== 'admin' && newRoleLevel >= currentRoleLevel) {
        res.status(403).json({ error: 'You can only assign roles below your own level' });
        return;
      }
    }
    
    // MANAGER RESTRICTIONS
    if (currentRole === 'manager') {
      // Can only edit employees in their own department
      if (targetEmployee.department_id !== currentDeptId) {
        res.status(403).json({ error: 'Managers can only edit employees in their own department' });
        return;
      }
      
      // Cannot change department
      if (department_id !== undefined && department_id !== currentDeptId) {
        res.status(403).json({ error: 'Managers cannot move employees to other departments' });
        return;
      }
      
      // Cannot grant OR REMOVE manage_employees, admin_access, or view_audit_logs permissions
      if (permissions !== undefined) {
        const restrictedPerms = ['manage_employees', 'admin_access', 'view_audit_logs'];
        // Convert permission IDs to names for checking
        const permQuery = `SELECT id, name FROM permissions WHERE id IN (${permissions.map(() => '?').join(',')})`;
        db.all(permQuery, permissions, (err, permRows: any[]) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const permIdToName = new Map(permRows.map((p: any) => [p.id.toString(), p.name]));
          
          // Check for restricted permissions being added or removed
          for (const restrictedPerm of restrictedPerms) {
            // Find the ID of this restricted permission
            const restrictedPermId = Array.from(permIdToName.entries())
              .find(([id, name]) => name === restrictedPerm)?.[0];
            
            if (restrictedPermId) {
              const hadPermission = targetCurrentPermissions.includes(parseInt(restrictedPermId));
              const willHavePermission = permissions.includes(parseInt(restrictedPermId));
              
              // Only allow if permission state is unchanged
              if (hadPermission !== willHavePermission) {
                res.status(403).json({ 
                  error: `Managers cannot ${willHavePermission ? 'grant' : 'remove'} ${restrictedPerm} permission` 
                });
                return;
              }
            }
          }
          
          // Proceed with update
          performUpdate();
        });
        return;
      }
    }
    
    // AGENT RESTRICTIONS - Agents can only edit viewers
    if (currentRole === 'agent') {
      // Cannot grant OR REMOVE manage_employees, admin_access, or view_audit_logs permissions
      if (permissions !== undefined) {
        const restrictedPerms = ['manage_employees', 'admin_access', 'view_audit_logs'];
        const permQuery = `SELECT id, name FROM permissions WHERE id IN (${permissions.map(() => '?').join(',')})`;
        db.all(permQuery, permissions, (err, permRows: any[]) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const permIdToName = new Map(permRows.map((p: any) => [p.id.toString(), p.name]));
          
          // Check for restricted permissions being added or removed
          for (const restrictedPerm of restrictedPerms) {
            const restrictedPermId = Array.from(permIdToName.entries())
              .find(([id, name]) => name === restrictedPerm)?.[0];
            
            if (restrictedPermId) {
              const hadPermission = targetCurrentPermissions.includes(parseInt(restrictedPermId));
              const willHavePermission = permissions.includes(parseInt(restrictedPermId));
              
              // Only allow if permission state is unchanged
              if (hadPermission !== willHavePermission) {
                res.status(403).json({ 
                  error: `Agents cannot ${willHavePermission ? 'grant' : 'remove'} ${restrictedPerm} permission` 
                });
                return;
              }
            }
          }
          
          // Proceed with update
          performUpdate();
        });
        return;
      }
    }
    
    // ADMIN - no restrictions, proceed with update
    performUpdate();
  });
  
  function performUpdate() {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (role !== undefined) {
      const validRoles = ['admin', 'manager', 'agent', 'viewer'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: 'Invalid role' });
        return;
      }
      updates.push('role = ?');
      params.push(role);
    }
    
    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        res.status(400).json({ error: 'Permissions must be an array' });
        return;
      }
      updates.push('permissions = ?');
      params.push(JSON.stringify(permissions));
    }
    
    if (department_id !== undefined) {
      updates.push('department_id = ?');
      params.push(department_id);
    }
    
    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }
    
    updates.push('updated_at = datetime(\'now\')');
    params.push(id);
    
    const query = `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(query, params, function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }
      
      res.json({ message: 'Employee updated successfully' });
    });
  }
};

/**
 * Deactivate/activate employee
 * Access: Admin (all employees), Agent with manage_employees (all employees), Manager with manage_employees (department only)
 */
export const toggleEmployeeStatus = (req: Request, res: Response) => {
  const { id } = req.params;
  const { is_active } = req.body;
  const currentEmployee = (req as any).employee;
  const currentRole = currentEmployee.role;
  const currentDeptId = currentEmployee.department_id;
  const currentPermissions = currentEmployee.permissions || [];
  
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Invalid employee ID' });
    return;
  }
  
  if (typeof is_active !== 'boolean') {
    res.status(400).json({ error: 'is_active must be a boolean' });
    return;
  }
  
  // Check if user has manage_employees permission or is admin
  if (currentRole !== 'admin' && !currentPermissions.includes('manage_employees')) {
    res.status(403).json({ error: 'You do not have permission to manage employees' });
    return;
  }
  
  // Get target employee to check their role
  db.get('SELECT department_id, role FROM employees WHERE id = ?', [id], (err, targetEmployee: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!targetEmployee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
    
    // Only admins can deactivate other admins
    if (targetEmployee.role === 'admin' && currentRole !== 'admin') {
      res.status(403).json({ error: 'Only administrators can activate/deactivate admin accounts' });
      return;
    }
    
    // Managers can only toggle status for employees in their department
    if (currentRole === 'manager') {
      if (targetEmployee.department_id !== currentDeptId) {
        res.status(403).json({ error: 'Managers can only manage employees in their own department' });
        return;
      }
    }
    
    performStatusUpdate();
  });
  
  function performStatusUpdate() {
    const query = `UPDATE employees SET is_active = ?, updated_at = datetime('now') WHERE id = ?`;
    
    db.run(query, [is_active ? 1 : 0, id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }
      
      res.json({ 
        message: `Employee ${is_active ? 'activated' : 'deactivated'} successfully` 
      });
    });
  }
};

/**
 * Update employee password
 */
export const updateEmployeePassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { current_password, new_password } = req.body;
  
  // Validate inputs
  if (!current_password || !new_password) {
    res.status(400).json({ error: 'Current and new password are required' });
    return;
  }
  
  if (new_password.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }
  
  // Ensure employee can only update their own password (unless admin)
  if (req.employee && req.employee.id !== parseInt(id) && req.employee.role !== 'admin') {
    res.status(403).json({ error: 'You can only update your own password' });
    return;
  }
  
  try {
    // Get current password hash
    db.get('SELECT password_hash FROM employees WHERE id = ?', [id], async (err, row: any) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (!row) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }
      
      // Verify current password
      const isValid = await bcrypt.compare(current_password, row.password_hash);
      
      if (!isValid) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }
      
      // Hash new password
      const new_password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
      
      // Update password
      db.run(
        'UPDATE employees SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [new_password_hash, id],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          res.json({ message: 'Password updated successfully' });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Password update failed' });
  }
};

/**
 * Get all departments
 */
export const getAllDepartments = (req: Request, res: Response) => {
  const query = 'SELECT * FROM departments ORDER BY name';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
};

/**
 * Create a new department
 * Admin only
 */
export const createDepartment = (req: Request, res: Response) => {
  const { name, description } = req.body;
  
  if (!name) {
    res.status(400).json({ error: 'Department name is required' });
    return;
  }
  
  const query = `INSERT INTO departments (name, description, created_at, updated_at) 
                 VALUES (?, ?, datetime('now'), datetime('now'))`;
  
  db.run(query, [name, description], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'Department name already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    
    res.status(201).json({
      id: this.lastID,
      name,
      description
    });
  });
};

/**
 * Update department
 * Admin only
 */
export const updateDepartment = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Invalid department ID' });
    return;
  }
  
  const updates: string[] = [];
  const params: any[] = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  
  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }
  
  updates.push('updated_at = datetime(\'now\')');
  params.push(id);
  
  const query = `UPDATE departments SET ${updates.join(', ')} WHERE id = ?`;
  
  db.run(query, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }
    
    res.json({ message: 'Department updated successfully' });
  });
};

/**
 * Get all available permissions
 */
export const getAllPermissions = (req: Request, res: Response) => {
  const query = 'SELECT * FROM permissions ORDER BY resource, action';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
};

/**
 * Get all roles
 */
export const getAllRoles = (req: Request, res: Response) => {
  const query = 'SELECT * FROM roles ORDER BY name';
  
  db.all(query, [], (err, rows: any[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Parse permissions JSON for each role
    const roles = rows.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions || '[]')
    }));
    
    res.json(roles);
  });
};
