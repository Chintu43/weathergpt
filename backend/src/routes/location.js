import express from 'express';
import { geocodingService } from '../services/geocodingService.js';
import { validateSearchQuery } from '../middleware/validateRequest.js';

const router = express.Router();

/**
 * GET /api/location/search?query=...
 */
router.get('/search', validateSearchQuery, async (req, res, next) => {
  try {
    const results = await geocodingService.searchLocations(req.searchQuery);
    return res.json({
      success: true,
      query: req.searchQuery,
      results
    });
  } catch (err) {
    next(err);
  }
});

export default router;
