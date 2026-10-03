import express from 'express';
import { openMeteoService } from '../services/openMeteoService.js';
import { validateCoordinates } from '../middleware/validateRequest.js';

const router = express.Router();

/**
 * GET /api/forecast?latitude=...&longitude=...&days=7
 */
router.get('/', validateCoordinates, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.coordinates;
    const days = parseInt(req.query.days, 10) || 7;

    const forecastData = await openMeteoService.getForecast(latitude, longitude, days);

    return res.json({
      success: true,
      data: forecastData
    });
  } catch (err) {
    next(err);
  }
});

export default router;
