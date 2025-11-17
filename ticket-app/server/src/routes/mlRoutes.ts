import express from 'express';
import {
  checkMLHealth,
  predictCategory,
  analyzeSentiment,
  predictFull,
  predictBatch
} from '../controllers/mlController';
import { authenticate } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';

const router = express.Router();

/**
 * ML Service Routes
 * All routes require authentication
 * Rate limiting removed for ML endpoints to allow real-time predictions
 */

// Health check for ML service
router.get('/ml/health', authenticate, checkMLHealth);

// Predict ticket category (type and priority)
router.post('/ml/predict-category', authenticate, predictCategory);

// Analyze sentiment
router.post('/ml/analyze-sentiment', authenticate, analyzeSentiment);

// Full prediction (category + sentiment)
router.post('/ml/predict-full', authenticate, predictFull);

// Batch prediction
router.post('/ml/predict-batch', authenticate, predictBatch);

export default router;
