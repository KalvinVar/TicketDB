import express from 'express';
import { 
  getAllTickets, 
  getTicketById, 
  createTicket, 
  updateTicket, 
  closeTicket,
  deleteTicket,
  createEmployeeTicket
} from '../controllers/ticketController';
import {
  addNote,
  getTicketNotes,
  deleteNote
} from '../controllers/noteController';
import { 
  authenticate, 
  requireEmployee, 
  requireAdmin,
  requirePermission 
} from '../middleware/auth';
import {
  validateTicketCreation,
  validateTicketUpdate,
  validateNoteCreation
} from '../middleware/validation';
import { apiLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Public/User routes - with validation and rate limiting
router.get('/tickets', authenticate, apiLimiter, getAllTickets);
router.get('/tickets/:id', authenticate, apiLimiter, getTicketById);
router.post('/tickets', authenticate, apiLimiter, validateTicketCreation, createTicket);

// Employee ticket creation - with validation
router.post('/tickets/employee/create', 
  authenticate, 
  requireEmployee, 
  requirePermission('create_tickets'),
  apiLimiter,
  validateTicketCreation, 
  createEmployeeTicket
);

// Ticket notes routes - with validation
router.post('/tickets/:id/notes', 
  authenticate, 
  requireEmployee, 
  apiLimiter,
  validateNoteCreation,
  addNote
);
router.get('/tickets/:id/notes', authenticate, apiLimiter, getTicketNotes);
router.delete('/tickets/:ticketId/notes/:noteId', authenticate, requireEmployee, apiLimiter, deleteNote);

// Employee routes - with validation
router.put('/tickets/:id', 
  authenticate, 
  requireEmployee, 
  requirePermission('edit_tickets'),
  apiLimiter,
  validateTicketUpdate, 
  updateTicket
);
router.patch('/tickets/:id/close', 
  authenticate, 
  requireEmployee, 
  requirePermission('close_tickets'),
  apiLimiter,
  closeTicket
);

// Admin routes
router.delete('/tickets/:id', authenticate, requireAdmin, apiLimiter, deleteTicket);

export default router;