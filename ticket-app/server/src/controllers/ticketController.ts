import { Request, Response } from 'express';
import { db } from '../config/database';
import { Ticket } from '../types';

export const getAllTickets = (req: Request, res: Response) => {
  // Fetch all tickets (remove LIMIT for full dataset)
  db.all('SELECT rowid as id, subject as title, body as description, type as status, priority, queue, language FROM tickets', [], (err, rows: Ticket[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
};

export const getTicketById = (req: Request, res: Response) => {
  const { id } = req.params;
  db.get('SELECT rowid as id, subject as title, body as description, type as status, priority, queue, language FROM tickets WHERE rowid = ?', [id], (err, row: Ticket) => {
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

export const createTicket = (req: Request, res: Response) => {
  const { title, description, status, priority } = req.body;
  const query = `INSERT INTO tickets (subject, body, type, priority) 
                 VALUES (?, ?, ?, ?)`;
  
  db.run(query, [title, description, status, priority], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, title, description, status, priority });
  });
};