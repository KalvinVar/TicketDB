import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

/**
 * User Registration
 * Creates a new customer account with hashed password
 */
export const registerUser = async (req: Request, res: Response) => {
  const { email, password, first_name, last_name, phone, company } = req.body;
  
  // Input validation
  if (!email || !password || !first_name || !last_name) {
    res.status(400).json({ error: 'Email, password, first name, and last name are required' });
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
  
  try {
    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (row) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }
      
      // Hash password
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Insert new user
      const query = `INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        phone, 
        company,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`;
      
      db.run(query, [email, password_hash, first_name, last_name, phone, company], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        // Generate JWT token
        const token = jwt.sign(
          { id: this.lastID, email, type: 'user' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        
        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: {
            id: this.lastID,
            email,
            first_name,
            last_name,
            phone,
            company
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * User Login
 * Authenticates customer and returns JWT token
 */
export const loginUser = (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  // Input validation
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  
  // Find user by email
  const query = `SELECT 
    id, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    phone, 
    company,
    is_active 
  FROM users WHERE email = ?`;
  
  db.get(query, [email], async (err, user: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    
    if (!user.is_active) {
      res.status(403).json({ error: 'Account is inactive' });
      return;
    }
    
    try {
      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isValid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, type: 'user' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          company: user.company
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });
};

/**
 * Employee Registration (Admin only)
 * Creates a new employee account with hashed password
 */
export const registerEmployee = async (req: Request, res: Response) => {
  const { 
    email, 
    password, 
    first_name, 
    last_name, 
    department_id,
    role = 'agent',
    permissions = []
  } = req.body;
  
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
            message: 'Employee registered successfully',
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
    res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * Employee Login
 * Authenticates employee and returns JWT token with permissions
 */
export const loginEmployee = (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  // Input validation
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  
  // Find employee by email with department info
  const query = `SELECT 
    e.id, 
    e.email, 
    e.password_hash, 
    e.first_name, 
    e.last_name, 
    e.department_id,
    e.role,
    e.permissions,
    e.is_active,
    d.name as department_name
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  WHERE e.email = ?`;
  
  db.get(query, [email], async (err, employee: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!employee) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    
    if (!employee.is_active) {
      res.status(403).json({ error: 'Account is inactive' });
      return;
    }
    
    try {
      // Verify password
      const isValid = await bcrypt.compare(password, employee.password_hash);
      
      if (!isValid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      
      // Parse permissions JSON (these are permission IDs)
      let permissionIds = [];
      try {
        permissionIds = JSON.parse(employee.permissions || '[]');
      } catch (e) {
        permissionIds = [];
      }
      
      // Fetch permission names from IDs (if any)
      if (permissionIds.length === 0) {
        // No permissions to fetch, generate token with empty permissions
        const token = jwt.sign(
          { 
            id: employee.id, 
            email: employee.email, 
            type: 'employee',
            role: employee.role,
            department_id: employee.department_id,
            permissions: []
          },
          JWT_SECRET,
          { expiresIn: '8h' }
        );
        
        res.json({
          message: 'Login successful',
          token,
          employee: {
            id: employee.id,
            email: employee.email,
            first_name: employee.first_name,
            last_name: employee.last_name,
            department_id: employee.department_id,
            department_name: employee.department_name,
            role: employee.role,
            permissions: []
          }
        });
        return;
      }
      
      // Fetch permission names from IDs
      const permissionQuery = `SELECT name FROM permissions WHERE id IN (${permissionIds.map(() => '?').join(',')})`;
      
      db.all(permissionQuery, permissionIds, (err, permRows: any[]) => {
        if (err) {
          console.error('Error fetching permission names:', err);
        }
        
        // Extract permission names
        const permissions = permRows ? permRows.map(p => p.name) : [];
        
        // Generate JWT token with employee data
        const token = jwt.sign(
          { 
            id: employee.id, 
            email: employee.email, 
            type: 'employee',
            role: employee.role,
            department_id: employee.department_id,
            permissions
          },
          JWT_SECRET,
          { expiresIn: '8h' } // Shorter expiry for employee sessions
        );
        
        res.json({
          message: 'Login successful',
          token,
          employee: {
            id: employee.id,
            email: employee.email,
            first_name: employee.first_name,
            last_name: employee.last_name,
            department_id: employee.department_id,
            department_name: employee.department_name,
            role: employee.role,
            permissions
          }
        });
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });
};

/**
 * Verify Token
 * Validates JWT token and returns user/employee data
 */
export const verifyToken = (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    res.json({ valid: true, data: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Refresh Employee Token
 * Fetches fresh employee data and permissions from database and generates new token
 */
export const refreshEmployeeToken = (req: Request, res: Response) => {
  const employee = (req as any).employee; // From authenticate middleware
  
  if (!employee) {
    res.status(401).json({ error: 'Not authenticated as employee' });
    return;
  }

  // Fetch fresh employee data from database
  const query = `SELECT 
    e.id, 
    e.email, 
    e.first_name, 
    e.last_name, 
    e.department_id,
    e.role,
    e.permissions,
    e.is_active,
    d.name as department_name
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  WHERE e.id = ?`;

  db.get(query, [employee.id], (err, freshEmployee: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!freshEmployee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    if (!freshEmployee.is_active) {
      res.status(403).json({ error: 'Account is inactive' });
      return;
    }

    // Parse permissions JSON
    let permissionIds = [];
    try {
      permissionIds = JSON.parse(freshEmployee.permissions || '[]');
    } catch (e) {
      permissionIds = [];
    }

    if (permissionIds.length === 0) {
      // No permissions, generate token with empty array
      const token = jwt.sign(
        {
          id: freshEmployee.id,
          email: freshEmployee.email,
          type: 'employee',
          role: freshEmployee.role,
          department_id: freshEmployee.department_id,
          permissions: []
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        message: 'Token refreshed successfully',
        token,
        employee: {
          id: freshEmployee.id,
          email: freshEmployee.email,
          first_name: freshEmployee.first_name,
          last_name: freshEmployee.last_name,
          department_id: freshEmployee.department_id,
          department_name: freshEmployee.department_name,
          role: freshEmployee.role,
          permissions: []
        }
      });
      return;
    }

    // Fetch permission names from IDs
    const permissionQuery = `SELECT name FROM permissions WHERE id IN (${permissionIds.map(() => '?').join(',')})`;

    db.all(permissionQuery, permissionIds, (err, permRows: any[]) => {
      if (err) {
        console.error('Error fetching permission names:', err);
      }

      // Extract permission names
      const permissions = permRows ? permRows.map(p => p.name) : [];

      // Generate new JWT token
      const token = jwt.sign(
        {
          id: freshEmployee.id,
          email: freshEmployee.email,
          type: 'employee',
          role: freshEmployee.role,
          department_id: freshEmployee.department_id,
          permissions
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        message: 'Token refreshed successfully',
        token,
        employee: {
          id: freshEmployee.id,
          email: freshEmployee.email,
          first_name: freshEmployee.first_name,
          last_name: freshEmployee.last_name,
          department_id: freshEmployee.department_id,
          department_name: freshEmployee.department_name,
          role: freshEmployee.role,
          permissions
        }
      });
    });
  });
};
