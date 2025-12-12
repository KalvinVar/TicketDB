import express from 'express';
import { getAnalytics, exportAnalytics } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticate);

// Get analytics data
router.get('/', getAnalytics);

// Export analytics as CSV
router.get('/export', exportAnalytics);

export default router;
