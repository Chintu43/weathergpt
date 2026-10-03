/**
 * Express Request Validation Middleware
 */

export function validateCoordinates(req, res, next) {
  const lat = parseFloat(req.query.latitude ?? req.body?.latitude);
  const lon = parseFloat(req.query.longitude ?? req.body?.longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_COORDINATES',
        message: 'Valid latitude and longitude numbers are required.'
      }
    });
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'OUT_OF_BOUNDS_COORDINATES',
        message: 'Latitude must be between -90 and 90. Longitude must be between -180 and 180.'
      }
    });
  }

  req.coordinates = { latitude: lat, longitude: lon };
  next();
}

export function validateSearchQuery(req, res, next) {
  const query = req.query.query;
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SEARCH_QUERY',
        message: 'Search query string must be at least 2 characters long.'
      }
    });
  }
  req.searchQuery = query.trim();
  next();
}

export function validateFarmerRequest(req, res, next) {
  const { state, district, question } = req.body || {};

  if (!state || !district) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_LOCATION',
        message: 'Both state and district are required for agricultural advice.'
      }
    });
  }

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_QUESTION',
        message: 'A farming question or query is required.'
      }
    });
  }

  next();
}

export function validateTravelRequest(req, res, next) {
  const { destination, date } = req.body || {};

  if (!destination || typeof destination !== 'string' || !destination.trim()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_DESTINATION',
        message: 'Destination name is required.'
      }
    });
  }

  if (!date || typeof date !== 'string' || isNaN(Date.parse(date))) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DATE',
        message: 'A valid date string (YYYY-MM-DD) is required.'
      }
    });
  }

  next();
}
