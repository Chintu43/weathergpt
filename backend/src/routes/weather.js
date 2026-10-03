import express from 'express';
import { openMeteoService } from '../services/openMeteoService.js';
import { validateCoordinates } from '../middleware/validateRequest.js';

const router = express.Router();

/**
 * GET /api/weather?latitude=...&longitude=...
 */
router.get('/', validateCoordinates, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.coordinates;
    const locationName = req.query.locationName || `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;

    const weatherData = await openMeteoService.getCurrentWeather(latitude, longitude, locationName);

    return res.json({
      success: true,
      data: weatherData
    });
  } catch (err) {
    next(err);
  }
});

export default router;
