import express from 'express';
import {
  getPublicArticles,
  getArticleById,
  getCategories,
  rateArticle,
  getAllArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  publishFromTicket
} from '../controllers/knowledgeBaseController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes (no authentication required)
router.get('/public/articles', getPublicArticles);
router.get('/public/articles/:id', getArticleById);
router.get('/public/categories', getCategories);
router.post('/public/articles/:id/rate', rateArticle);

// Protected routes (authentication required)
router.get('/articles', authenticate, getAllArticles);
router.post('/articles', authenticate, createArticle);
router.put('/articles/:id', authenticate, updateArticle);
router.delete('/articles/:id', authenticate, deleteArticle);
router.post('/articles/publish-from-ticket', authenticate, publishFromTicket);

export default router;
