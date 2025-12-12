import { Request, Response } from 'express';
import { db } from '../config/database';

/**
 * Get all published knowledge base articles
 * Public endpoint - no authentication required
 */
export const getPublicArticles = (req: Request, res: Response) => {
  const search = req.query.search as string || '';
  const category = req.query.category as string || '';
  
  let query = `
    SELECT 
      id,
      title,
      content,
      category,
      tags,
      created_at,
      updated_at,
      view_count,
      helpful_count,
      not_helpful_count
    FROM kb_articles
    WHERE is_published = 1
  `;
  
  const params: any[] = [];
  
  if (search) {
    query += ` AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }
  
  query += ` ORDER BY view_count DESC, helpful_count DESC, created_at DESC`;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
};

/**
 * Get a single article by ID
 * Increments view count
 */
export const getArticleById = (req: Request, res: Response) => {
  const { id } = req.params;
  
  db.get(`
    SELECT 
      id,
      title,
      content,
      category,
      tags,
      source_ticket_id,
      created_at,
      updated_at,
      view_count,
      helpful_count,
      not_helpful_count
    FROM kb_articles
    WHERE id = ? AND is_published = 1
  `, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    
    // Increment view count
    db.run(`UPDATE kb_articles SET view_count = view_count + 1 WHERE id = ?`, [id]);
    
    res.json(row);
  });
};

/**
 * Get categories for filtering
 */
export const getCategories = (req: Request, res: Response) => {
  db.all(`
    SELECT DISTINCT category, COUNT(*) as article_count
    FROM kb_articles
    WHERE is_published = 1
    GROUP BY category
    ORDER BY article_count DESC
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
};

/**
 * Mark article as helpful or not helpful
 */
export const rateArticle = (req: Request, res: Response) => {
  const { id } = req.params;
  const { helpful } = req.body;
  
  if (typeof helpful !== 'boolean') {
    res.status(400).json({ error: 'helpful field must be boolean' });
    return;
  }
  
  const field = helpful ? 'helpful_count' : 'not_helpful_count';
  
  db.run(`UPDATE kb_articles SET ${field} = ${field} + 1 WHERE id = ?`, [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json({ message: 'Rating recorded', helpful });
  });
};

/**
 * Get all articles for employee management (includes unpublished)
 * Requires authentication
 */
export const getAllArticles = (req: Request, res: Response) => {
  const employee = (req as any).employee;
  
  if (!employee) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  db.all(`
    SELECT 
      kb.id,
      kb.title,
      kb.content,
      kb.category,
      kb.tags,
      kb.source_ticket_id,
      kb.created_at,
      kb.updated_at,
      kb.view_count,
      kb.helpful_count,
      kb.not_helpful_count,
      kb.is_published,
      e.first_name || ' ' || e.last_name as created_by_name
    FROM kb_articles kb
    LEFT JOIN employees e ON kb.created_by = e.id
    ORDER BY kb.created_at DESC
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
};

/**
 * Create a new knowledge base article
 * Requires authentication
 */
export const createArticle = (req: Request, res: Response) => {
  const employee = (req as any).employee;
  
  if (!employee) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const { title, content, category, tags, source_ticket_id, is_published } = req.body;
  
  if (!title || !content || !category) {
    res.status(400).json({ error: 'Title, content, and category are required' });
    return;
  }
  
  db.run(`
    INSERT INTO kb_articles (title, content, category, tags, source_ticket_id, created_by, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [title, content, category, tags || '', source_ticket_id || null, employee.id, is_published ? 1 : 0], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, message: 'Article created successfully' });
  });
};

/**
 * Update an existing article
 * Requires authentication
 */
export const updateArticle = (req: Request, res: Response) => {
  const employee = (req as any).employee;
  
  if (!employee) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const { id } = req.params;
  const { title, content, category, tags, is_published } = req.body;
  
  db.run(`
    UPDATE kb_articles 
    SET title = ?, content = ?, category = ?, tags = ?, is_published = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [title, content, category, tags || '', is_published ? 1 : 0, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json({ message: 'Article updated successfully' });
  });
};

/**
 * Delete an article
 * Requires authentication
 */
export const deleteArticle = (req: Request, res: Response) => {
  const employee = (req as any).employee;
  
  if (!employee) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const { id } = req.params;
  
  db.run(`DELETE FROM kb_articles WHERE id = ?`, [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json({ message: 'Article deleted successfully' });
  });
};

/**
 * Publish an article from a resolved ticket
 * Requires authentication
 */
export const publishFromTicket = (req: Request, res: Response) => {
  const employee = (req as any).employee;
  
  if (!employee) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const { ticket_id, category, tags } = req.body;
  
  if (!ticket_id || !category) {
    res.status(400).json({ error: 'ticket_id and category are required' });
    return;
  }
  
  // Get ticket details
  db.get(`
    SELECT subject as title, body || '\n\n' || resolution_notes as content
    FROM tickets
    WHERE rowid = ? AND status IN ('resolved', 'closed')
  `, [ticket_id], (err, ticket: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found or not resolved' });
      return;
    }
    
    // Create article from ticket
    db.run(`
      INSERT INTO kb_articles (title, content, category, tags, source_ticket_id, created_by, is_published)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [ticket.title, ticket.content, category, tags || '', ticket_id, employee.id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, message: 'Article published from ticket' });
    });
  });
};
