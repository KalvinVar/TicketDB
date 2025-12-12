import { Request, Response } from 'express';
import { db } from '../config/database';

/**
 * Get comprehensive analytics data for dashboard
 * Includes ticket counts, resolution metrics, agent performance, trends
 */
export const getAnalytics = (req: Request, res: Response) => {
  const employee = (req as any).employee;
  
  // Check permissions
  const permissions = employee.permissions || [];
  const canViewAnalytics = employee.role === 'admin' || permissions.includes('view_all_tickets');
  
  if (!canViewAnalytics) {
    res.status(403).json({ error: 'You do not have permission to view analytics' });
    return;
  }

  // Parse date range from query params (default to all time - 10 years back)
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date('2015-01-01');
  
  console.log('📊 Analytics request - date filtering disabled (no created_at column in tickets table)');
  
  // Debug: Check total tickets in database
  db.get(`SELECT COUNT(*) as total FROM tickets`, [], (err, row: any) => {
    if (err) {
      console.error('Error checking tickets:', err);
    } else {
      console.log('🔍 Total tickets in DB:', row);
    }
  });
  
  const analytics = {
    overview: {} as any,
    statusDistribution: [] as any[],
    priorityDistribution: [] as any[],
    typeDistribution: [] as any[],
    agentPerformance: [] as any[],
    departmentMetrics: [] as any[],
    timeSeriesData: [] as any[],
    resolutionTimes: {} as any
  };

  let completedQueries = 0;
  const totalQueries = 7;

  const checkComplete = () => {
    completedQueries++;
    if (completedQueries === totalQueries) {
      res.json(analytics);
    }
  };

  // 1. Overview metrics (NO DATE FILTER - tickets table has no created_at column)
  db.get(`
    SELECT 
      COUNT(*) as total_tickets,
      COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
      AVG(CASE 
        WHEN status IN ('resolved', 'closed') AND closed_at IS NOT NULL
        THEN (julianday(datetime('now')) - julianday(closed_at)) 
      END) as avg_resolution_days
    FROM tickets
  `, [], (err, row: any) => {
    if (err) {
      console.error('Error fetching overview:', err);
      analytics.overview = { error: err.message };
    } else {
      console.log('📊 Overview results:', row);
      analytics.overview = row;
    }
    checkComplete();
  });

  // 2. Status distribution
  db.all(`
    SELECT status, COUNT(*) as count
    FROM tickets
    GROUP BY status
    ORDER BY count DESC
  `, [], (err, rows) => {
    if (err) {
      console.error('Error fetching status distribution:', err);
    } else {
      analytics.statusDistribution = rows;
    }
    checkComplete();
  });

  // 3. Priority distribution
  db.all(`
    SELECT priority, COUNT(*) as count
    FROM tickets
    GROUP BY priority
    ORDER BY 
      CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
        ELSE 4 
      END
  `, [], (err, rows) => {
    if (err) {
      console.error('Error fetching priority distribution:', err);
    } else {
      analytics.priorityDistribution = rows;
    }
    checkComplete();
  });

  // 4. Type distribution
  db.all(`
    SELECT type, COUNT(*) as count
    FROM tickets
    GROUP BY type
    ORDER BY count DESC
  `, [], (err, rows) => {
    if (err) {
      console.error('Error fetching type distribution:', err);
    } else {
      analytics.typeDistribution = rows;
    }
    checkComplete();
  });

  // 5. Agent performance
  db.all(`
    SELECT 
      e.first_name || ' ' || e.last_name as agent_name,
      e.id as agent_id,
      COUNT(*) as tickets_handled,
      COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as tickets_resolved,
      0 as avg_resolution_days,
      COUNT(CASE WHEN t.priority = 'high' THEN 1 END) as high_priority_handled
    FROM tickets t
    LEFT JOIN employees e ON t.assigned_to = e.id
    WHERE t.assigned_to IS NOT NULL
    GROUP BY e.id, e.first_name, e.last_name
    ORDER BY tickets_resolved DESC
    LIMIT 10
  `, [], (err, rows) => {
    if (err) {
      console.error('Error fetching agent performance:', err);
    } else {
      analytics.agentPerformance = rows;
    }
    checkComplete();
  });

  // 6. Department metrics
  db.all(`
    SELECT 
      d.name as department_name,
      d.id as department_id,
      COUNT(*) as ticket_count,
      COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as resolved_count,
      0 as avg_resolution_days
    FROM tickets t
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE t.department_id IS NOT NULL
    GROUP BY d.id, d.name
    ORDER BY ticket_count DESC
  `, [], (err, rows) => {
    if (err) {
      console.error('Error fetching department metrics:', err);
    } else {
      analytics.departmentMetrics = rows;
    }
    checkComplete();
  });

  // 7. Time series data (using closed_at since no created_at column)
  db.all(`
    SELECT 
      DATE(closed_at) as date,
      COUNT(*) as tickets_created,
      COUNT(*) as tickets_resolved
    FROM tickets
    WHERE closed_at IS NOT NULL
    GROUP BY DATE(closed_at)
    ORDER BY date ASC
    LIMIT 30
  `, [], (err, rows) => {
    if (err) {
      console.error('Error fetching time series:', err);
    } else {
      analytics.timeSeriesData = rows;
    }
    checkComplete();
  });
};

/**
 * Export analytics data as CSV
 */
export const exportAnalytics = (req: Request, res: Response) => {
  const employee = (req as any).employee;
  const permissions = employee.permissions || [];
  const canViewAnalytics = employee.role === 'admin' || permissions.includes('view_all_tickets');
  
  if (!canViewAnalytics) {
    res.status(403).json({ error: 'You do not have permission to export analytics' });
    return;
  }

  const exportType = req.query.type || 'tickets';
  
  if (exportType === 'tickets') {
    db.all(`
      SELECT 
        t.rowid as id,
        t.subject as title,
        t.type,
        t.priority,
        t.status,
        t.created_at,
        t.updated_at,
        d.name as department,
        e.first_name || ' ' || e.last_name as assigned_to
      FROM tickets t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN employees e ON t.assigned_to = e.id
      ORDER BY t.created_at DESC
    `, [], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Convert to CSV
      if (rows.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=tickets_export.csv');
        res.send('No data available');
        return;
      }
      
      const headers = Object.keys(rows[0] as any).join(',');
      const csvRows = rows.map((row: any) => 
        Object.values(row).map(val => 
          typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        ).join(',')
      );
      
      const csv = [headers, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=tickets_export.csv');
      res.send(csv);
    });
  } else {
    res.status(400).json({ error: 'Invalid export type' });
  }
};
