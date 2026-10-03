import express from 'express';

const router = express.Router();

/**
 * GET /api/alerts
 * Official Weather Warnings & Advisories Endpoint
 */
router.get('/', async (req, res, next) => {
  try {
    // Modular design: returns empty official warnings list until an official feed (e.g. IMD/SACHET API) is connected
    return res.json({
      success: true,
      official: [],
      advisories: [],
      all: [],
      source: 'No official alert provider configured',
      officialUnavailableReason: 'Official IMD / SACHET / CWC warning feeds are not connected in this build.',
      fetchedAt: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

export default router;
