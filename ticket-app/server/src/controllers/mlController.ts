/**
 * ML Controller for Express.js Server
 * Handles ML prediction requests by proxying to Flask ML service
 */
import { Request, Response } from 'express';
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Check if ML service is available
 */
export const checkMLHealth = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: 5000
    });
    res.json({
      status: 'connected',
      ml_service: response.data
    });
  } catch (error: unknown) {
    res.status(503).json({
      status: 'unavailable',
      error: 'ML service is not responding',
      message: 'Please ensure Python ML service is running on port 5001'
    });
  }
};

/**
 * Predict ticket category (type and priority)
 * POST /api/ml/predict-category
 * Body: { title: string, description: string }
 */
export const predictCategory = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;

    if (!title && !description) {
      res.status(400).json({ error: 'title or description required' });
      return;
    }

    const response = await axios.post(
      `${ML_SERVICE_URL}/predict/category`,
      { title, description },
      { timeout: 10000 }
    );

    res.json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: 'ML service unavailable',
          message: 'Please start the Python ML service: python ml_models/ml_service.py'
        });
        return;
      }
      res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

/**
 * Analyze sentiment of ticket text
 * POST /api/ml/analyze-sentiment
 * Body: { text: string }
 */
export const analyzeSentiment = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: 'text required' });
      return;
    }

    const response = await axios.post(
      `${ML_SERVICE_URL}/predict/sentiment`,
      { text },
      { timeout: 10000 }
    );

    res.json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: 'ML service unavailable',
          message: 'Please start the Python ML service: python ml_models/ml_service.py'
        });
        return;
      }
      res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

/**
 * Get full prediction (category + sentiment)
 * POST /api/ml/predict-full
 * Body: { title: string, description: string }
 */
export const predictFull = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;

    if (!title && !description) {
      res.status(400).json({ error: 'title or description required' });
      return;
    }

    const response = await axios.post(
      `${ML_SERVICE_URL}/predict/full`,
      { title, description },
      { timeout: 15000 }
    );

    res.json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: 'ML service unavailable',
          message: 'Please start the Python ML service: python ml_models/ml_service.py'
        });
        return;
      }
      res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

/**
 * Batch prediction for multiple tickets
 * POST /api/ml/predict-batch
 * Body: { tickets: Array<{ title: string, description: string }> }
 */
export const predictBatch = async (req: Request, res: Response) => {
  try {
    const { tickets } = req.body;

    if (!tickets || !Array.isArray(tickets)) {
      res.status(400).json({ error: 'tickets array required' });
      return;
    }

    const response = await axios.post(
      `${ML_SERVICE_URL}/predict/batch`,
      { tickets },
      { timeout: 30000 }
    );

    res.json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: 'ML service unavailable',
          message: 'Please start the Python ML service: python ml_models/ml_service.py'
        });
        return;
      }
      res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
