import express from 'express';
import { getAllTickets, getTicketById, createTicket } from '../controllers/ticketController';

const router = express.Router();

router.get('/tickets', getAllTickets);
router.get('/tickets/:id', getTicketById);
router.post('/tickets', createTicket);

export default router;