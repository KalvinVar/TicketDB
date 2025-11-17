import { Request, Response } from 'express';
import { db } from '../config/database';
import { Ticket } from '../types';

/**
 * Get all tickets with optional filtering
 * Uses prepared statements to prevent SQL injection
 */
export const getAllTickets = (req: Request, res: Response) => {
  // Check if employee has view permissions
  if ((req as any).employee) {
    const employee = (req as any).employee;
    const permissions = employee.permissions || [];
    const hasViewAllTickets = employee.role === 'admin' || permissions.includes('view_all_tickets');
    const hasViewTickets = permissions.includes('view_tickets');
    
    // If employee doesn't have either view permission, deny access
    if (!hasViewAllTickets && !hasViewTickets) {
      res.status(403).json({ error: 'You do not have permission to view tickets' });
      return;
    }
    
    // If they only have view_tickets (not view_all_tickets), filter by their department
    if (hasViewTickets && !hasViewAllTickets && employee.department_id) {
      // Will add department filter below
      req.query.department_id = employee.department_id.toString();
    }
  }
  
  // Build query with filters (all using prepared statements)
  // LEFT JOIN with departments to get department name
  // LEFT JOIN with ticket_assignments to get creator and assignee info
  let query = `SELECT 
    t.rowid as id, 
    t.subject as title, 
    t.body as description, 
    t.type, 
    t.status,
    t.priority, 
    t.queue, 
    t.language,
    t.user_id,
    t.assigned_to,
    t.department_id,
    t.resolution_notes,
    d.name as department_name,
    COALESCE(creator_user.first_name || ' ' || creator_user.last_name, 
             creator_emp.first_name || ' ' || creator_emp.last_name, 
             'Unknown') as creator_name,
    assignee.first_name || ' ' || assignee.last_name as assignee_name
  FROM tickets t
  LEFT JOIN departments d ON t.department_id = d.id
  LEFT JOIN ticket_assignments ta ON t.rowid = ta.ticket_id
  LEFT JOIN users creator_user ON ta.created_by_user_id = creator_user.id
  LEFT JOIN employees creator_emp ON ta.created_by_employee_id = creator_emp.id
  LEFT JOIN employees assignee ON t.assigned_to = assignee.id
  WHERE 1=1`;
  
  const params: any[] = [];
  
  // Filter by department (if provided)
  if (req.query.department_id) {
    query += ' AND t.department_id = ?';
    params.push(req.query.department_id);
  }
  
  // Filter by assigned employee (if provided)
  if (req.query.assigned_to) {
    query += ' AND t.assigned_to = ?';
    params.push(req.query.assigned_to);
  }
  
  // Filter by status (if provided)
  if (req.query.status) {
    query += ' AND t.status = ?';
    params.push(req.query.status);
  }
  
  // Filter by priority (if provided)
  if (req.query.priority) {
    query += ' AND t.priority = ?';
    params.push(req.query.priority);
  }
  
  query += ' ORDER BY t.rowid DESC';
  
  db.all(query, params, (err, rows: Ticket[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
};

/**
 * Get a single ticket by ID
 * Uses prepared statement to prevent SQL injection
 */
export const getTicketById = (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Validate ID is a number
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Invalid ticket ID' });
    return;
  }
  
  const query = `SELECT 
    t.rowid as id, 
    t.subject as title, 
    t.body as description, 
    t.type,
    t.status,
    t.priority, 
    t.queue, 
    t.language,
    t.user_id,
    t.assigned_to,
    t.department_id,
    t.resolution_notes,
    d.name as department_name,
    COALESCE(creator_user.first_name || ' ' || creator_user.last_name, 
             creator_emp.first_name || ' ' || creator_emp.last_name, 
             'Unknown') as creator_name,
    assignee.first_name || ' ' || assignee.last_name as assignee_name
  FROM tickets t
  LEFT JOIN departments d ON t.department_id = d.id
  LEFT JOIN ticket_assignments ta ON t.rowid = ta.ticket_id
  LEFT JOIN users creator_user ON ta.created_by_user_id = creator_user.id
  LEFT JOIN employees creator_emp ON ta.created_by_employee_id = creator_emp.id
  LEFT JOIN employees assignee ON t.assigned_to = assignee.id
  WHERE t.rowid = ?`;
  
  db.get(query, [id], (err, row: Ticket) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    res.json(row);
  });
};

/**
 * Create a new ticket
 * Uses prepared statements and input validation
 */
export const createTicket = (req: Request, res: Response) => {
  const { 
    title, 
    description, 
    type = 'request',
    priority = 'medium',
    department_id,
    user_id
  } = req.body;
  
  // Input validation
  if (!title || !description) {
    res.status(400).json({ error: 'Title and description are required' });
    return;
  }
  
  if (title.length > 500) {
    res.status(400).json({ error: 'Title is too long (max 500 characters)' });
    return;
  }
  
  // Validate type
  const validTypes = ['request', 'problem', 'incident', 'question'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: 'Invalid ticket type' });
    return;
  }
  
  // Validate priority
  const validPriorities = ['low', 'medium', 'high'];
  if (!validPriorities.includes(priority)) {
    res.status(400).json({ error: 'Invalid priority' });
    return;
  }
  
  // Use prepared statement with parameterized query
  const query = `INSERT INTO tickets (
    subject, 
    body, 
    type, 
    priority,
    status,
    department_id,
    user_id
  ) VALUES (?, ?, ?, ?, 'open', ?, ?)`;
  
  db.run(query, [title, description, type, priority, department_id, user_id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const ticketId = this.lastID;
    
    // Create assignment record (user created ticket)
    const assignmentQuery = `INSERT INTO ticket_assignments (
      ticket_id,
      created_by_user_id
    ) VALUES (?, ?)`;
    
    db.run(assignmentQuery, [ticketId, user_id], (err) => {
      if (err) {
        console.error('Error creating assignment record:', err);
        // Continue even if assignment record fails
      }
      
      res.status(201).json({ 
        id: ticketId, 
        title, 
        description, 
        type,
        status: 'open',
        priority,
        department_id,
        user_id
      });
    });
  });
};

/**
 * Update an existing ticket (for employees)
 * Uses prepared statements and validates all inputs
 */
export const updateTicket = (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    title, 
    description, 
    type,
    status,
    priority,
    assigned_to,
    department_id
  } = req.body;
  
  // Validate ID
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Invalid ticket ID' });
    return;
  }
  
  // Build update query dynamically but safely
  const updates: string[] = [];
  const params: any[] = [];
  
  if (title !== undefined) {
    if (title.length > 500) {
      res.status(400).json({ error: 'Title is too long' });
      return;
    }
    updates.push('subject = ?');
    params.push(title);
  }
  
  if (description !== undefined) {
    updates.push('body = ?');
    params.push(description);
  }
  
  if (type !== undefined) {
    const validTypes = ['request', 'problem', 'incident', 'question'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: 'Invalid ticket type' });
      return;
    }
    updates.push('type = ?');
    params.push(type);
  }
  
  if (status !== undefined) {
    const validStatuses = ['open', 'in_progress', 'pending', 'closed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    updates.push('status = ?');
    params.push(status);
  }
  
  if (priority !== undefined) {
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      res.status(400).json({ error: 'Invalid priority' });
      return;
    }
    updates.push('priority = ?');
    params.push(priority);
  }
  
  if (assigned_to !== undefined) {
    updates.push('assigned_to = ?');
    params.push(assigned_to);
  }
  
  if (department_id !== undefined) {
    updates.push('department_id = ?');
    params.push(department_id);
  }
  
  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }
  
  // Always update the updated_at timestamp (if column exists)
  // params.push('updated_at = datetime(\'now\')');
  
  // Add the ticket ID to params
  params.push(id);
  
  const query = `UPDATE tickets SET ${updates.join(', ')} WHERE rowid = ?`;
  
  db.run(query, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    res.json({ message: 'Ticket updated successfully', changes: this.changes });
  });
};

/**
 * Close a ticket (for employees)
 * Uses prepared statements
 */
export const closeTicket = (req: Request, res: Response) => {
  const { id } = req.params;
  const { resolution_notes, employee_id } = req.body;
  
  // Validate ID
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Invalid ticket ID' });
    return;
  }
  
  if (!resolution_notes) {
    res.status(400).json({ error: 'Resolution notes are required' });
    return;
  }
  
  const query = `UPDATE tickets 
    SET status = 'closed',
        resolution_notes = ?,
        closed_at = datetime('now'),
        closed_by = ?
    WHERE rowid = ?`;
  
  db.run(query, [resolution_notes, employee_id, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    res.json({ message: 'Ticket closed successfully' });
  });
};

/**
 * Delete a ticket (admin only)
 * Uses prepared statement
 */
export const deleteTicket = (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Validate ID
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Invalid ticket ID' });
    return;
  }
  
  db.run('DELETE FROM tickets WHERE rowid = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    res.json({ message: 'Ticket deleted successfully' });
  });
};

/**
 * Create a ticket as an employee (for internal tickets)
 * Uses prepared statements and creates proper assignment record
 */
export const createEmployeeTicket = (req: Request, res: Response) => {
  const { 
    title, 
    description, 
    type = 'request',
    priority = 'medium',
    department_id,
    assigned_to
  } = req.body;
  
  const employeeId = (req as any).employee.id;
  
  // Input validation
  if (!title || !description) {
    res.status(400).json({ error: 'Title and description are required' });
    return;
  }
  
  if (title.length > 500) {
    res.status(400).json({ error: 'Title is too long (max 500 characters)' });
    return;
  }
  
  // Validate type
  const validTypes = ['request', 'problem', 'incident', 'question'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: 'Invalid ticket type' });
    return;
  }
  
  // Validate priority
  const validPriorities = ['low', 'medium', 'high'];
  if (!validPriorities.includes(priority)) {
    res.status(400).json({ error: 'Invalid priority' });
    return;
  }
  
  // Insert ticket
  const ticketQuery = `INSERT INTO tickets (
    subject, 
    body, 
    type, 
    priority,
    status,
    department_id,
    assigned_to
  ) VALUES (?, ?, ?, ?, 'open', ?, ?)`;
  
  db.run(ticketQuery, [title, description, type, priority, department_id, assigned_to], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const ticketId = this.lastID;
    
    // Create assignment record (employee created ticket)
    const assignmentQuery = `INSERT INTO ticket_assignments (
      ticket_id,
      created_by_employee_id,
      assigned_to_employee_id,
      assigned_by_employee_id
    ) VALUES (?, ?, ?, ?)`;
    
    db.run(assignmentQuery, [ticketId, employeeId, assigned_to, employeeId], (err) => {
      if (err) {
        console.error('Error creating assignment record:', err);
        // Continue even if assignment record fails
      }
      
      res.status(201).json({ 
        id: ticketId, 
        title, 
        description, 
        type,
        status: 'open',
        priority,
        department_id,
        assigned_to,
        created_by_employee_id: employeeId
      });
    });
  });
};
