import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ticketRoutes from './routes/ticketRoutes';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import mlRoutes from './routes/mlRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import knowledgeBaseRoutes from './routes/knowledgeBaseRoutes';

// Load environment variables FIRST
dotenv.config();

// Run migrations
import './migrations/create_audit_logs';
import { addViewAuditLogsPermission } from './migrations/add_view_audit_logs_permission';
import './migrations/create_knowledge_base';

// Execute migrations
addViewAuditLogsPermission();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', ticketRoutes);
app.use('/api', authRoutes);
app.use('/api', adminRoutes);
app.use('/api', mlRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/kb', knowledgeBaseRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/tickets`);
  console.log(`Auth endpoints: /api/auth/user/login, /api/auth/employee/login`);
  console.log(`Admin endpoints: /api/employees, /api/departments`);
  console.log(`ML endpoints: /api/ml/predict-category, /api/ml/analyze-sentiment`);
  console.log(`Analytics endpoint: /api/analytics`);
  console.log(`Knowledge Base: /api/kb/public/articles`);
});