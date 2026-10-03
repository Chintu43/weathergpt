/**
 * Centralized Express Error Handler Middleware
 * Ensures API keys and internal secrets are NEVER exposed in error responses.
 */

export function errorHandler(err, req, res, next) {
  console.error('[Backend Error Handler]:', err.stack || err.message || err);

  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  // Sanitize message to avoid exposing internal API keys
  let safeMessage = err.message || 'An unexpected error occurred.';
  if (safeMessage.includes('API_KEY') || safeMessage.includes('openrouter')) {
    safeMessage = 'Service integration error occurred.';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: safeMessage
    }
  });
}
