/**
 * Simple in-memory cache with TTL (Time To Live).
 * Prevents redundant external API calls.
 */

class SimpleCache {
  constructor(defaultTtlSeconds = 600) {
    this.cache = new Map();
    this.defaultTtl = defaultTtlSeconds * 1000;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds) {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtl;
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt, timestamp: new Date().toISOString() });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

export const weatherCache = new SimpleCache(600); // 10 minutes cache for weather
export const locationCache = new SimpleCache(3600); // 1 hour cache for geocoding
