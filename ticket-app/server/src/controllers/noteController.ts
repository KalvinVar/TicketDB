import { Request, Response } from 'express';
import { db } from '../config/database';
import { TicketNote } from '../types';

/**
 * Add a note to a ticket
 * POST /api/tickets/:id/notes
 */
export const addNote = (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id);
  const { note_text, is_internal } = req.body;
  const employeeId = (req as any).employee.id; // JWT token stores it as 'id', not 'employeeId'

  if (!note_text) {
    res.status(400).json({ error: 'Note text is required' });
    return;
  }

  // Verify ticket exists
  db.get(
    'SELECT rowid as id FROM tickets WHERE rowid = ?',
    [ticketId],
    (err, ticket) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (!ticket) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }

      // Insert note
      db.run(
        `INSERT INTO ticket_notes (ticket_id, employee_id, note_text, is_internal)
         VALUES (?, ?, ?, ?)`,
        [ticketId, employeeId, note_text, is_internal ? 1 : 0],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          res.status(201).json({
            id: this.lastID,
            ticket_id: ticketId,
            employee_id: employeeId,
            note_text,
            is_internal: is_internal ? true : false,
            created_at: new Date().toISOString()
          });
        }
      );
    }
  );
};

/**
 * Get all notes for a ticket
 * GET /api/tickets/:id/notes
 */
export const getTicketNotes = (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id);
  const employee = (req as any).employee;
  const user = (req as any).user;

  // Check if user is employee or customer
  const isEmployee = !!employee;

  // Build query based on user type
  // Employees see all notes, customers only see non-internal notes
  const query = `
    SELECT 
      tn.id,
      tn.ticket_id,
      tn.employee_id,
      tn.note_text,
      tn.is_internal,
      tn.created_at,
      e.first_name || ' ' || e.last_name as employee_name
    FROM ticket_notes tn
    LEFT JOIN employees e ON tn.employee_id = e.id
    WHERE tn.ticket_id = ?
    ${isEmployee ? '' : 'AND tn.is_internal = 0'}
    ORDER BY tn.created_at DESC
  `;

  db.all(query, [ticketId], (err, notes: any[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const formattedNotes: TicketNote[] = notes.map(note => ({
      id: note.id,
      ticket_id: note.ticket_id,
      employee_id: note.employee_id,
      employee_name: note.employee_name,
      note_text: note.note_text,
      is_internal: note.is_internal === 1,
      created_at: note.created_at
    }));

    res.json(formattedNotes);
  });
};

/**
 * Delete a note (admin/manager only)
 * DELETE /api/tickets/:ticketId/notes/:noteId
 */
export const deleteNote = (req: Request, res: Response) => {
  const noteId = parseInt(req.params.noteId);
  const employeeId = (req as any).employee.id; // JWT token stores it as 'id', not 'employeeId'

  // Verify note exists and was created by this employee (or user is admin)
  db.get(
    'SELECT id, employee_id FROM ticket_notes WHERE id = ?',
    [noteId],
    (err, note: any) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (!note) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }

      // Only allow deletion if note was created by this employee or user is admin
      const permissions = (req as any).employee.permissions || [];
      const isAdmin = permissions.includes('admin_access');

      if (note.employee_id !== employeeId && !isAdmin) {
        res.status(403).json({ error: 'You can only delete your own notes' });
        return;
      }

      db.run('DELETE FROM ticket_notes WHERE id = ?', [noteId], (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        res.json({ message: 'Note deleted successfully' });
      });
    }
  );
};
